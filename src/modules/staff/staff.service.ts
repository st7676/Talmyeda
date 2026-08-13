import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FieldEntityType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { DynamicFieldsValidatorService } from '../dynamic-fields/dynamic-fields-validator.service';
import { DynamicQueryService } from '../dynamic-fields/dynamic-query.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff, StaffDocument } from './schemas/staff.schema';

/** System (non-dynamic) fields sortable via a plain index-backed sort. Spec 60. */
const SYSTEM_SORT_FIELDS = new Set(['firstName', 'lastName', 'createdAt']);

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    private readonly dynamicFieldsValidator: DynamicFieldsValidatorService,
    private readonly dynamicQueryService: DynamicQueryService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateStaffDto,
    actingRole: Role = Role.Admin,
  ): Promise<StaffDocument> {
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Staff,
      role: actingRole,
      customFields: dto.customFields ?? [],
    });
    return this.staffModel.create({
      institutionId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields: dto.customFields ?? [],
    });
  }

  /** GET /staff — pagination plus dynamic-field filter/sort (spec 38-40, 76). */
  async findAll(
    institutionId: string,
    query: QueryStaffDto,
    actingRole: Role = Role.Admin,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, filters, sortBy, sortDir } = query;
    const filter = { institutionId, isDeleted: false };
    const [{ items: rawItems, total }, viewableKeys] = await Promise.all([
      this.dynamicQueryService.findAll(
        this.staffModel,
        institutionId,
        FieldEntityType.Staff,
        filter,
        {
          page,
          limit,
          filters,
          sortBy,
          sortDir,
          systemSortFields: SYSTEM_SORT_FIELDS,
        },
      ),
      this.dynamicFieldsValidator.getViewableKeys(
        institutionId,
        FieldEntityType.Staff,
        actingRole,
      ),
    ]);
    const items = rawItems.map((doc) =>
      this.toReadable(
        doc as StaffDocument | Record<string, unknown>,
        viewableKeys,
      ),
    );
    return { items, page, limit, total };
  }

  async findOne(
    id: string,
    institutionId: string,
    actingRole: Role = Role.Admin,
  ): Promise<Record<string, unknown>> {
    const staff = await this.staffModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!staff) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
    const viewableKeys = await this.dynamicFieldsValidator.getViewableKeys(
      institutionId,
      FieldEntityType.Staff,
      actingRole,
    );
    return this.toReadable(staff, viewableKeys);
  }

  async update(
    id: string,
    institutionId: string,
    dto: UpdateStaffDto,
    actingRole: Role = Role.Admin,
  ): Promise<Record<string, unknown>> {
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Staff,
      role: actingRole,
      customFields: dto.customFields,
    });
    const staff = await this.staffModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!staff) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
    const viewableKeys = await this.dynamicFieldsValidator.getViewableKeys(
      institutionId,
      FieldEntityType.Staff,
      actingRole,
    );
    return this.toReadable(staff, viewableKeys);
  }

  /**
   * Applies field-level READ filtering (spec 21) to a document destined for
   * an API response. Accepts either a Mongoose document (from .find()) or a
   * plain object (from .aggregate(), used by dynamic-field sorting) since
   * aggregate results never have Mongoose document methods.
   */
  private toReadable(
    doc: StaffDocument | Record<string, unknown>,
    viewableKeys: Set<string> | null,
  ): Record<string, unknown> {
    const obj = (typeof (doc as StaffDocument).toObject === 'function'
      ? (doc as StaffDocument).toObject()
      : doc) as unknown as Record<string, unknown> & {
      customFields: { k: string; v: unknown }[];
    };
    obj.customFields = this.dynamicFieldsValidator.filterByViewableKeys(
      obj.customFields,
      viewableKeys,
    );
    return obj;
  }

  /** Soft delete. Spec section 59. */
  async softDelete(id: string, institutionId: string): Promise<void> {
    const res = await this.staffModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
      )
      .exec();
    if (!res) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
  }

  /** Used by StaffGroups to verify a same-tenant reference (spec 58.1). */
  async assertExists(id: string, institutionId: string): Promise<void> {
    const exists = await this.staffModel
      .exists({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!exists) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
  }
}
