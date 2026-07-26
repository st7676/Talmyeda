import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InstitutionStatus, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import {
  generateTempPassword,
  hashPassword,
} from '../../common/utils/password.util';
import { InstitutionsService } from '../institutions/institutions.service';
import { ParticipantUserMode } from '../institutions/schemas/institution-settings.schema';
import { ParticipantsService } from '../participants/participants.service';
import { UsersService } from '../users/users.service';
import { ApproveRegistrationRequestDto } from './dto/approve-registration-request.dto';
import { QueryRegistrationRequestsDto } from './dto/query-registration-requests.dto';
import { SubmitRegistrationRequestDto } from './dto/submit-registration-request.dto';
import {
  RegistrationRequest,
  RegistrationRequestDocument,
  RegistrationRequestStatus,
} from './schemas/registration-request.schema';

@Injectable()
export class RegistrationRequestsService {
  constructor(
    @InjectModel(RegistrationRequest.name)
    private readonly requestModel: Model<RegistrationRequestDocument>,
    private readonly institutionsService: InstitutionsService,
    private readonly participantsService: ParticipantsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * POST /registration-requests. Spec sections 13, 84. Public — the
   * submitter is not authenticated, so institutionId travels in the body
   * (documented exception, see the DTO's comment).
   */
  async submit(
    dto: SubmitRegistrationRequestDto,
  ): Promise<RegistrationRequestDocument> {
    const institution = await this.institutionsService
      .getMe(dto.institutionId)
      .catch(() => null);
    if (
      !institution ||
      institution.institution.status !== InstitutionStatus.Active
    ) {
      throw AppError.notFound(
        'Institution not found or not accepting registrations',
        'INSTITUTION_NOT_FOUND',
      );
    }
    if (!institution.settings?.selfRegistrationEnabled) {
      throw AppError.forbidden(
        'Self-registration is disabled for this institution',
        'SELF_REGISTRATION_DISABLED',
      );
    }

    // v1 performs no automatic duplicate detection (spec 13.1) — duplicates
    // are allowed and left to manual admin review.
    return this.requestModel.create({
      institutionId: dto.institutionId,
      requestedData: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        customFields: dto.customFields ?? [],
      },
      status: RegistrationRequestStatus.Pending,
    });
  }

  /** GET /registration-requests. Spec section 84 — Administrator only. */
  async findAll(
    institutionId: string,
    query: QueryRegistrationRequestsDto,
  ): Promise<PaginatedResult<RegistrationRequestDocument>> {
    const { page, limit, status } = query;
    const filter: Record<string, unknown> = { institutionId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  /**
   * POST /registration-requests/:id/approve. Spec section 15: creates the
   * Participant, copies the approved data, optionally creates a User per
   * institution settings, and marks the request approved.
   */
  async approve(
    id: string,
    institutionId: string,
    dto: ApproveRegistrationRequestDto,
  ): Promise<{
    requestId: string;
    participantId: string;
    tempPassword?: string;
  }> {
    const request = await this.getPending(id, institutionId);
    const settings = await this.institutionsService.getSettings(institutionId);

    const participant = await this.participantsService.create(institutionId, {
      firstName: request.requestedData.firstName,
      lastName: request.requestedData.lastName,
      customFields: request.requestedData.customFields,
    });

    let tempPassword: string | undefined;
    const shouldCreateUser =
      settings.participantUserMode === ParticipantUserMode.Always ||
      (settings.participantUserMode === ParticipantUserMode.Optional &&
        dto.createUser === true);

    if (shouldCreateUser) {
      const username = this.generateUsername(
        request.requestedData.firstName,
        request.requestedData.lastName,
      );
      const plain = generateTempPassword();
      const passwordHash = await hashPassword(plain);
      await this.usersService.createRaw({
        institutionId,
        username,
        passwordHash,
        role: Role.Participant,
        participantId: participant._id,
        mustChangePassword: true,
      });
      tempPassword = plain;
    }

    request.status = RegistrationRequestStatus.Approved;
    await request.save();

    return {
      requestId: request._id.toString(),
      participantId: participant._id.toString(),
      tempPassword,
    };
  }

  /** POST /registration-requests/:id/reject. Spec section 15. */
  async reject(id: string, institutionId: string): Promise<void> {
    const request = await this.getPending(id, institutionId);
    request.status = RegistrationRequestStatus.Rejected;
    await request.save();
  }

  private async getPending(
    id: string,
    institutionId: string,
  ): Promise<RegistrationRequestDocument> {
    const request = await this.requestModel
      .findOne({ _id: id, institutionId })
      .exec();
    if (!request) {
      throw AppError.notFound(
        'Registration request not found',
        'REGISTRATION_REQUEST_NOT_FOUND',
      );
    }
    if (request.status !== RegistrationRequestStatus.Pending) {
      throw AppError.conflict(
        'Registration request already reviewed',
        'ALREADY_REVIEWED',
      );
    }
    return request;
  }

  private generateUsername(firstName: string, lastName: string): string {
    const base = `${firstName}.${lastName}`
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9.]/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base || 'participant'}.${suffix}`;
  }
}
