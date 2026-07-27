import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FieldEntityType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { AuthenticatedUser, PaginatedResult } from '../../common/interfaces';
import { DynamicFieldsValidatorService } from '../dynamic-fields/dynamic-fields-validator.service';
import { InstitutionsService } from '../institutions/institutions.service';
import {
  ParticipantGroup,
  ParticipantGroupDocument,
} from '../participant-groups/schemas/participant-group.schema';
import {
  StaffGroup,
  StaffGroupDocument,
} from '../staff-groups/schemas/staff-group.schema';
import { UsersService } from '../users/users.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { QueryParticipantsDto } from './dto/query-participants.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { Participant, ParticipantDocument } from './schemas/participant.schema';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,
    @InjectModel(ParticipantGroup.name)
    private readonly participantGroupModel: Model<ParticipantGroupDocument>,
    @InjectModel(StaffGroup.name)
    private readonly staffGroupModel: Model<StaffGroupDocument>,
    private readonly institutionsService: InstitutionsService,
    private readonly usersService: UsersService,
    private readonly dynamicFieldsValidator: DynamicFieldsValidatorService,
  ) {}

  /** POST /participants. Spec section 71 (Administrator, or Staff per settings). */
  async create(
    institutionId: string,
    dto: CreateParticipantDto,
    actingRole: Role = Role.Admin,
  ): Promise<ParticipantDocument> {
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Participant,
      role: actingRole,
      customFields: dto.customFields ?? [],
    });
    return this.participantModel.create({
      institutionId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields: dto.customFields ?? [],
    });
  }

  /** GET /participants — pagination, search (system fields), groupId filter. Spec 72, 85. */
  async findAll(
    user: AuthenticatedUser,
    query: QueryParticipantsDto,
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const institutionId = this.requireInstitution(user);
    const { page, limit, search, groupId } = query;
    const filter: Record<string, unknown> = { institutionId, isDeleted: false };

    if (search) {
      const regex = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }];
    }

    if (groupId) {
      const ids = await this.activeParticipantIdsInGroup(
        institutionId,
        groupId,
      );
      filter._id = { $in: ids };
    }

    await this.applyContextScope(user, filter);

    const [items, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.participantModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  /** GET /participants/:id. Spec section 73. */
  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ParticipantDocument> {
    const institutionId = this.requireInstitution(user);
    const participant = await this.participantModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!participant)
      throw AppError.notFound('Participant not found', 'PARTICIPANT_NOT_FOUND');
    await this.assertAccessible(user, participant);
    return participant;
  }

  /** PUT /participants/:id. Spec section 74 (entity + field permission checks happen upstream). */
  async update(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateParticipantDto,
  ): Promise<ParticipantDocument> {
    // Load first so we can enforce context-aware access before writing (spec 519, 833).
    await this.findOne(id, user);
    const institutionId = this.requireInstitution(user);
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Participant,
      role: user.role,
      customFields: dto.customFields,
    });
    const participant = await this.participantModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!participant)
      throw AppError.notFound('Participant not found', 'PARTICIPANT_NOT_FOUND');
    return participant;
  }

  /** DELETE /participants/:id — soft delete. Spec sections 59, 75. */
  async softDelete(id: string, institutionId: string): Promise<void> {
    const res = await this.participantModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
      )
      .exec();
    if (!res)
      throw AppError.notFound('Participant not found', 'PARTICIPANT_NOT_FOUND');
  }

  /** Used by ParticipantGroups to verify a same-tenant reference (spec 58.1). */
  async assertExists(id: string, institutionId: string): Promise<void> {
    const exists = await this.participantModel
      .exists({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!exists)
      throw AppError.notFound('Participant not found', 'PARTICIPANT_NOT_FOUND');
  }

  /**
   * Context-aware relationship scoping (spec 519, 833):
   * STAFF only sees Participants in groups they're assigned to via
   * StaffGroup, when the institution has staffGroupManagementEnabled.
   * PARTICIPANT only sees their own record (spec 11) — enforced by the
   * caller via the linked participantId on the JWT-resolved User.
   */
  private async applyContextScope(
    user: AuthenticatedUser,
    filter: Record<string, unknown>,
  ): Promise<void> {
    if (user.role === Role.Participant) {
      const ownId = await this.resolveOwnParticipantId(user);
      filter._id = ownId ? { $in: [ownId] } : { $in: [] };
      return;
    }
    if (user.role !== Role.Staff) return;
    const institutionId = this.requireInstitution(user);
    const settings = await this.institutionsService.getSettings(institutionId);
    if (!settings.staffGroupManagementEnabled) return;

    const staffGroups = await this.staffGroupModel
      .find({ institutionId, staffId: user.userId })
      .select('groupId')
      .exec();
    const groupIds = staffGroups.map((sg) => sg.groupId);

    if (groupIds.length === 0) {
      // Assigned to no group: sees nothing rather than everything.
      filter._id = { $in: [] };
      return;
    }

    const memberships = await this.participantGroupModel
      .find({ institutionId, groupId: { $in: groupIds }, active: true })
      .select('participantId')
      .exec();
    const allowedIds = memberships.map((m) => m.participantId.toString());

    const existing = filter._id as { $in?: unknown[] } | undefined;
    if (existing?.$in) {
      const requested = new Set(existing.$in.map((x) => String(x)));
      filter._id = { $in: allowedIds.filter((id) => requested.has(id)) };
    } else {
      filter._id = { $in: allowedIds };
    }
  }

  private async assertAccessible(
    user: AuthenticatedUser,
    participant: ParticipantDocument,
  ): Promise<void> {
    if (user.role === Role.Participant) {
      const ownId = await this.resolveOwnParticipantId(user);
      if (!ownId || ownId !== participant._id.toString()) {
        throw AppError.forbidden(
          'Can only access your own record',
          'OUT_OF_SCOPE',
        );
      }
      return;
    }
    if (user.role !== Role.Staff) return;
    const institutionId = this.requireInstitution(user);
    const settings = await this.institutionsService.getSettings(institutionId);
    if (!settings.staffGroupManagementEnabled) return;

    const staffGroups = await this.staffGroupModel
      .find({ institutionId, staffId: user.userId })
      .select('groupId')
      .exec();
    const groupIds = staffGroups.map((sg) => sg.groupId);
    if (groupIds.length === 0) {
      throw AppError.forbidden(
        'Not assigned to this participant’s group',
        'OUT_OF_SCOPE',
      );
    }

    const isMember = await this.participantGroupModel
      .exists({
        institutionId,
        participantId: participant._id,
        groupId: { $in: groupIds },
        active: true,
      })
      .exec();
    if (!isMember) {
      throw AppError.forbidden(
        'Not assigned to this participant’s group',
        'OUT_OF_SCOPE',
      );
    }
  }

  /** Resolves the Participant linked to a PARTICIPANT-role User (spec 11, 48). */
  private async resolveOwnParticipantId(
    user: AuthenticatedUser,
  ): Promise<string | null> {
    const record = await this.usersService.findByIdForAuth(user.userId);
    return record?.participantId ? record.participantId.toString() : null;
  }

  private async activeParticipantIdsInGroup(
    institutionId: string,
    groupId: string,
  ) {
    const memberships = await this.participantGroupModel
      .find({ institutionId, groupId, active: true })
      .select('participantId')
      .exec();
    return memberships.map((m) => m.participantId);
  }

  private requireInstitution(user: AuthenticatedUser): string {
    if (!user.institutionId) {
      throw AppError.forbidden(
        'Action requires an institution-scoped user',
        'NO_INSTITUTION',
      );
    }
    return user.institutionId;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
