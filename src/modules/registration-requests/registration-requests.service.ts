import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FieldEntityType,
  FieldType,
  InstitutionStatus,
  Role,
} from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import {
  generateTempPassword,
  hashPassword,
} from '../../common/utils/password.util';
import { DynamicFieldsValidatorService } from '../dynamic-fields/dynamic-fields-validator.service';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';
import { FieldOptionsService } from '../field-options/field-options.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { ParticipantUserMode } from '../institutions/schemas/institution-settings.schema';
import { ParticipantsService } from '../participants/participants.service';
import { StaffService } from '../staff/staff.service';
import { UsersService } from '../users/users.service';
import { ApproveRegistrationRequestDto } from './dto/approve-registration-request.dto';
import { PublicFieldsQueryDto } from './dto/public-fields-query.dto';
import { QueryRegistrationRequestsDto } from './dto/query-registration-requests.dto';
import { SubmitRegistrationRequestDto } from './dto/submit-registration-request.dto';
import {
  RegistrationRequest,
  RegistrationRequestDocument,
  RegistrationRequestStatus,
} from './schemas/registration-request.schema';

/** Public-safe field metadata for rendering a self-registration form. */
export interface PublicFieldMeta {
  internalKey: string;
  displayName: string;
  fieldType: string;
  required: boolean;
  options?: { label: string; value: string }[];
}

/** entityType -> the Role whose FieldDefinition.permissions apply to self-edit. */
function selfRoleFor(
  entityType: FieldEntityType.Participant | FieldEntityType.Staff,
): Role {
  return entityType === FieldEntityType.Staff ? Role.Staff : Role.Participant;
}

@Injectable()
export class RegistrationRequestsService {
  constructor(
    @InjectModel(RegistrationRequest.name)
    private readonly requestModel: Model<RegistrationRequestDocument>,
    private readonly institutionsService: InstitutionsService,
    private readonly participantsService: ParticipantsService,
    private readonly staffService: StaffService,
    private readonly usersService: UsersService,
    private readonly dynamicFieldsValidator: DynamicFieldsValidatorService,
    private readonly fieldDefinitionsService: FieldDefinitionsService,
    private readonly fieldOptionsService: FieldOptionsService,
  ) {}

  /**
   * Shared guard for every public/unauthenticated entry point on this
   * service (submit, getPublicFields): the institution must exist, be
   * Active, and have self-registration turned on. Extracted so the new
   * public field-metadata endpoint can't be used to probe institutions that
   * aren't actually accepting registrations.
   */
  private async assertSelfRegistrationOpen(institutionId: string) {
    const institution = await this.institutionsService
      .getMe(institutionId)
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
  }

  /**
   * POST /registration-requests. Spec sections 13, 84. Public — the
   * submitter is not authenticated, so institutionId travels in the body
   * (documented exception, see the DTO's comment).
   */
  async submit(
    dto: SubmitRegistrationRequestDto,
  ): Promise<RegistrationRequestDocument> {
    await this.assertSelfRegistrationOpen(dto.institutionId);
    const entityType = dto.entityType ?? FieldEntityType.Participant;

    // Dynamic-field validation (spec 36-37: unknown-key rejection, type/
    // required checks, field-level write permission) was previously never
    // run on self-registration submissions — bad data only surfaced later,
    // confusingly, when an Admin tried to approve() it. The submitter isn't
    // authenticated and has no Role of their own, but the data becomes a
    // Participant/Staff record on approval, so we validate against that
    // entity type's FieldDefinition.permissions — the same permission that
    // governs a Participant editing their own record post-registration
    // (spec 21), extended here to Staff self-registration on the same
    // reasoning (permissions.staff describes STAFF-role self-edit on a
    // Staff-entityType field, mirroring permissions.participant). See
    // PROGRESS.md open decisions.
    await this.dynamicFieldsValidator.validate({
      institutionId: dto.institutionId,
      entityType,
      role: selfRoleFor(entityType),
      customFields: dto.customFields ?? [],
    });

    // v1 performs no automatic duplicate detection (spec 13.1) — duplicates
    // are allowed and left to manual admin review.
    return this.requestModel.create({
      institutionId: dto.institutionId,
      entityType,
      requestedData: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        customFields: dto.customFields ?? [],
      },
      status: RegistrationRequestStatus.Pending,
    });
  }

  /**
   * GET /registration-requests/fields — public. Lets the join form render
   * the institution's configured custom fields for the chosen entity type,
   * limited to fields that role is actually allowed to self-edit (mirrors
   * the write-permission check in validate() above, plus Select/MultiSelect
   * options so the form can render a dropdown without a second, admin-gated
   * call to GET /field-options).
   */
  async getPublicFields(
    query: PublicFieldsQueryDto,
  ): Promise<PublicFieldMeta[]> {
    await this.assertSelfRegistrationOpen(query.institutionId);
    const role = selfRoleFor(query.entityType);

    const definitions = await this.fieldDefinitionsService.findActiveForEntity(
      query.institutionId,
      query.entityType,
    );

    const editable = definitions.filter((d) => {
      const rolePermission =
        role === Role.Staff ? d.permissions.staff : d.permissions.participant;
      return rolePermission?.edit !== false;
    });

    return Promise.all(
      editable.map(async (d) => {
        const isSelect =
          d.fieldType === FieldType.Select ||
          d.fieldType === FieldType.MultiSelect;
        const options = isSelect
          ? (
              await this.fieldOptionsService.findForField(
                query.institutionId,
                d._id.toString(),
              )
            ).map((o) => ({ label: o.label, value: o.value }))
          : undefined;
        return {
          internalKey: d.internalKey,
          displayName: d.displayName,
          fieldType: d.fieldType,
          required: d.required,
          options,
        };
      }),
    );
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
   * Participant (or, for a Staff self-registration, the Staff record),
   * copies the approved data, optionally creates a User, and marks the
   * request approved.
   */
  async approve(
    id: string,
    institutionId: string,
    dto: ApproveRegistrationRequestDto,
  ): Promise<{
    requestId: string;
    entityType: FieldEntityType.Participant | FieldEntityType.Staff;
    participantId?: string;
    staffId?: string;
    tempPassword?: string;
  }> {
    const request = await this.getPending(id, institutionId);
    const entityType = request.entityType ?? FieldEntityType.Participant;

    if (entityType === FieldEntityType.Staff) {
      return this.approveStaff(request, institutionId, dto);
    }
    return this.approveParticipant(request, institutionId, dto);
  }

  private async approveParticipant(
    request: RegistrationRequestDocument,
    institutionId: string,
    dto: ApproveRegistrationRequestDto,
  ) {
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
      const plain = await this.createLoginFor(
        institutionId,
        request.requestedData.firstName,
        request.requestedData.lastName,
        Role.Participant,
        { participantId: participant._id },
      );
      tempPassword = plain;
    }

    request.status = RegistrationRequestStatus.Approved;
    await request.save();

    return {
      requestId: request._id.toString(),
      entityType: FieldEntityType.Participant as const,
      participantId: participant._id.toString(),
      tempPassword,
    };
  }

  /**
   * Staff self-registration has no institution-level "always/never/optional"
   * mode like participantUserMode — staff accounts are ordinarily
   * admin-created (spec 70), so a login is only created here when the
   * approving Administrator explicitly opts in via createUser:true. No
   * "Always" auto-create for staff, unlike participants.
   */
  private async approveStaff(
    request: RegistrationRequestDocument,
    institutionId: string,
    dto: ApproveRegistrationRequestDto,
  ) {
    const staff = await this.staffService.create(institutionId, {
      firstName: request.requestedData.firstName,
      lastName: request.requestedData.lastName,
      customFields: request.requestedData.customFields,
    });

    let tempPassword: string | undefined;
    if (dto.createUser === true) {
      tempPassword = await this.createLoginFor(
        institutionId,
        request.requestedData.firstName,
        request.requestedData.lastName,
        Role.Staff,
        { staffId: staff._id },
      );
    }

    request.status = RegistrationRequestStatus.Approved;
    await request.save();

    return {
      requestId: request._id.toString(),
      entityType: FieldEntityType.Staff as const,
      staffId: staff._id.toString(),
      tempPassword,
    };
  }

  private async createLoginFor(
    institutionId: string,
    firstName: string,
    lastName: string,
    role: Role,
    link: { participantId?: Types.ObjectId; staffId?: Types.ObjectId },
  ): Promise<string> {
    const username = this.generateUsername(firstName, lastName);
    const plain = generateTempPassword();
    const passwordHash = await hashPassword(plain);
    await this.usersService.createRaw({
      institutionId,
      username,
      passwordHash,
      role,
      ...link,
      mustChangePassword: true,
    });
    return plain;
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
