import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InstitutionStatus, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { hashPassword } from '../../common/utils/password.util';
import { UsersService } from '../users/users.service';
import { RegisterInstitutionDto } from './dto/register-institution.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Institution, InstitutionDocument } from './schemas/institution.schema';
import {
  InstitutionSettings,
  InstitutionSettingsDocument,
} from './schemas/institution-settings.schema';

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(
    @InjectModel(Institution.name)
    private readonly institutionModel: Model<InstitutionDocument>,
    @InjectModel(InstitutionSettings.name)
    private readonly settingsModel: Model<InstitutionSettingsDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Registers a new institution (spec section 69):
   * creates Institution (Pending), the Administrator User, and InstitutionSettings.
   */
  async register(
    dto: RegisterInstitutionDto,
  ): Promise<{ institutionId: string; status: InstitutionStatus }> {
    const institution = await this.institutionModel.create({
      name: dto.institutionName,
      status: InstitutionStatus.Pending,
    });

    try {
      const passwordHash = await hashPassword(dto.adminPassword);
      await this.usersService.createRaw({
        institutionId: institution._id,
        username: dto.adminUsername,
        passwordHash,
        role: Role.Admin,
        mustChangePassword: false,
      });
      await this.settingsModel.create({ institutionId: institution._id });
    } catch (err) {
      // Roll back the institution shell if admin/settings creation fails,
      // so a failed registration doesn't leave an orphan tenant.
      await this.institutionModel.deleteOne({ _id: institution._id }).exec();
      throw err;
    }

    return {
      institutionId: institution._id.toString(),
      status: institution.status,
    };
  }

  /** Raw settings lookup used by other modules (e.g. group-scoped staff access, spec 19). */
  async getSettings(
    institutionId: string,
  ): Promise<InstitutionSettingsDocument> {
    const settings = await this.settingsModel.findOne({ institutionId }).exec();
    if (!settings)
      throw AppError.notFound(
        'Institution settings not found',
        'SETTINGS_NOT_FOUND',
      );
    return settings;
  }

  /** GET /institutions/me — institution + settings. Spec section 69. */
  async getMe(institutionId: string) {
    const institution = await this.institutionModel
      .findOne({ _id: institutionId, isDeleted: false })
      .exec();
    if (!institution)
      throw AppError.notFound('Institution not found', 'INSTITUTION_NOT_FOUND');
    const settings = await this.settingsModel.findOne({ institutionId }).exec();
    return { institution, settings };
  }

  /** PUT /institutions/settings. Spec section 69. */
  async updateSettings(institutionId: string, dto: UpdateSettingsDto) {
    const settings = await this.settingsModel
      .findOneAndUpdate({ institutionId }, { $set: dto }, { new: true })
      .exec();
    if (!settings)
      throw AppError.notFound(
        'Institution settings not found',
        'SETTINGS_NOT_FOUND',
      );
    return settings;
  }

  // ---- Platform-level operations (SUPER_ADMIN only). Spec section 69.1. ----

  async listByStatus(
    status: InstitutionStatus | undefined,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<InstitutionDocument>> {
    const { page, limit } = pagination;
    const filter: Record<string, unknown> = { isDeleted: false };
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      this.institutionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.institutionModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  async approve(id: string): Promise<InstitutionDocument> {
    const inst = await this.getPending(id);
    inst.status = InstitutionStatus.Active;
    await inst.save();
    // TODO(section 69.1): notify the institution's Administrator by email once
    // the Notifications capability exists (deferred, section 103.4).
    this.logger.log(`Institution ${id} approved -> Active`);
    return inst;
  }

  async suspend(id: string): Promise<InstitutionDocument> {
    const inst = await this.getActiveOrSuspended(id);
    inst.status = InstitutionStatus.Suspended;
    await inst.save();
    return inst;
  }

  async reactivate(id: string): Promise<InstitutionDocument> {
    const inst = await this.findOrThrow(id);
    if (inst.status !== InstitutionStatus.Suspended) {
      throw AppError.conflict(
        'Only a suspended institution can be reactivated',
        'INVALID_STATE',
      );
    }
    inst.status = InstitutionStatus.Active;
    await inst.save();
    return inst;
  }

  async reject(id: string): Promise<InstitutionDocument> {
    const inst = await this.getPending(id);
    inst.status = InstitutionStatus.Rejected;
    await inst.save();
    // Mark the pending Administrator user inactive too (no business data exists yet).
    await this.usersService.rejectAllForInstitution(id);
    return inst;
  }

  private async findOrThrow(id: string): Promise<InstitutionDocument> {
    const inst = await this.institutionModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!inst)
      throw AppError.notFound('Institution not found', 'INSTITUTION_NOT_FOUND');
    return inst;
  }

  private async getPending(id: string): Promise<InstitutionDocument> {
    const inst = await this.findOrThrow(id);
    if (inst.status !== InstitutionStatus.Pending) {
      throw AppError.conflict(
        'Institution is not in Pending status',
        'INVALID_STATE',
      );
    }
    return inst;
  }

  private async getActiveOrSuspended(id: string): Promise<InstitutionDocument> {
    const inst = await this.findOrThrow(id);
    if (
      inst.status !== InstitutionStatus.Active &&
      inst.status !== InstitutionStatus.Suspended
    ) {
      throw AppError.conflict(
        'Institution must be Active to suspend',
        'INVALID_STATE',
      );
    }
    return inst;
  }
}
