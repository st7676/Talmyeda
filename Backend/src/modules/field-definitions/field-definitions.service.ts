import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { FieldEntityType, FieldType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { isValueCompatibleWithType } from '../../common/utils/field-value.util';
import { FieldOptionsService } from '../field-options/field-options.service';
import { Group, GroupDocument } from '../groups/schemas/group.schema';
import {
  Participant,
  ParticipantDocument,
} from '../participants/schemas/participant.schema';
import { Staff, StaffDocument } from '../staff/schemas/staff.schema';
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { QueryFieldDefinitionsDto } from './dto/query-field-definitions.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';
import {
  FieldDefinition,
  FieldDefinitionDocument,
} from './schemas/field-definition.schema';

/** Minimal shape shared by Participant/Staff/Group documents for dynamic-field purposes. */
interface CustomFieldsHolder {
  _id: Types.ObjectId;
  customFields: { k: string; v: unknown }[];
}

/** Field metadata safe to hand to a non-admin caller rendering their own edit form. */
export interface SelfEditableFieldMeta {
  internalKey: string;
  displayName: string;
  fieldType: FieldType;
  required: boolean;
  options?: { label: string; value: string }[];
}

@Injectable()
export class FieldDefinitionsService {
  private readonly logger = new Logger(FieldDefinitionsService.name);

  constructor(
    @InjectModel(FieldDefinition.name)
    private readonly fieldDefinitionModel: Model<FieldDefinitionDocument>,
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    private readonly fieldOptionsService: FieldOptionsService,
  ) {}

  /** POST /field-definitions. Spec sections 29, 80. */
  async create(
    institutionId: string,
    dto: CreateFieldDefinitionDto,
  ): Promise<FieldDefinitionDocument> {
    const internalKey = await this.generateUniqueInternalKey(institutionId);
    return this.fieldDefinitionModel.create({
      institutionId,
      entityType: dto.entityType,
      displayName: dto.displayName,
      internalKey,
      fieldType: dto.fieldType,
      required: dto.required ?? false,
      permissions: dto.permissions ?? {},
      displaySettings: dto.displaySettings ?? {},
      searchSettings: dto.searchSettings ?? {},
    });
  }

  /** GET /field-definitions. Spec section 81. */
  async findAll(
    institutionId: string,
    query: QueryFieldDefinitionsDto,
  ): Promise<PaginatedResult<FieldDefinitionDocument>> {
    const { page, limit, entityType } = query;
    const filter: Record<string, unknown> = { institutionId };
    if (entityType) filter.entityType = entityType;

    const [items, total] = await Promise.all([
      this.fieldDefinitionModel
        .find(filter)
        .sort({ 'displaySettings.order': 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.fieldDefinitionModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  /** Every active field definition for an entity type, unpaginated — used by validation logic. */
  findActiveForEntity(institutionId: string, entityType: FieldEntityType) {
    return this.fieldDefinitionModel.find({ institutionId, entityType }).exec();
  }

  /**
   * Field metadata a Participant/Staff member is allowed to self-edit on
   * their own record, with Select/MultiSelect options inlined so the caller
   * doesn't need a second (admin-gated) call to GET /field-options. Shared
   * by two callers that need the identical permission logic: the public
   * self-registration form (RegistrationRequestsService.getPublicFields,
   * institutionId from an unauthenticated request body) and the
   * authenticated "edit my profile" endpoint (GET /users/me/fields,
   * institutionId from the caller's own JWT).
   */
  async findSelfEditableFields(
    institutionId: string,
    entityType: FieldEntityType.Participant | FieldEntityType.Staff,
    role: Role.Participant | Role.Staff,
  ): Promise<SelfEditableFieldMeta[]> {
    const definitions = await this.findActiveForEntity(
      institutionId,
      entityType,
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
                institutionId,
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

  async findOne(
    id: string,
    institutionId: string,
  ): Promise<FieldDefinitionDocument> {
    const field = await this.fieldDefinitionModel
      .findOne({ _id: id, institutionId })
      .exec();
    if (!field)
      throw AppError.notFound(
        'Field definition not found',
        'FIELD_DEFINITION_NOT_FOUND',
      );
    return field;
  }

  /**
   * PUT /field-definitions/:id. Spec sections 30, 31, 32, 82.
   * required:false->true and fieldType changes go through explicit safety
   * checks against existing data before being applied.
   */
  async update(
    id: string,
    institutionId: string,
    dto: UpdateFieldDefinitionDto,
  ): Promise<FieldDefinitionDocument> {
    const field = await this.findOne(id, institutionId);

    if (dto.fieldType && dto.fieldType !== field.fieldType) {
      await this.assertTypeChangeSafe(field, dto.fieldType);
      field.fieldType = dto.fieldType;
    }

    if (dto.required === true && field.required === false) {
      await this.assertRequiredChangeSafe(
        field,
        dto.confirmRequiredChange ?? false,
      );
      field.required = true;
    } else if (dto.required === false) {
      field.required = false;
    }

    if (dto.displayName !== undefined) field.displayName = dto.displayName;
    if (dto.permissions?.staff)
      Object.assign(field.permissions.staff, dto.permissions.staff);
    if (dto.permissions?.participant) {
      Object.assign(field.permissions.participant, dto.permissions.participant);
    }
    if (dto.displaySettings)
      Object.assign(field.displaySettings, dto.displaySettings);
    if (dto.searchSettings)
      Object.assign(field.searchSettings, dto.searchSettings);

    await field.save();
    return field;
  }

  /**
   * DELETE /field-definitions/:id. Spec section 82.1: deletion is allowed
   * (unlike FieldOption). Removes the matching customFields entry from
   * every existing record for that entity type/institution as a background
   * cleanup job — not a synchronous part of the delete request.
   */
  async remove(id: string, institutionId: string): Promise<void> {
    const field = await this.findOne(id, institutionId);
    await this.fieldDefinitionModel.deleteOne({ _id: field._id }).exec();

    const model = this.modelForEntityType(field.entityType);
    // Fire-and-forget: caller does not wait on the cleanup (spec 82.1).
    model
      .updateMany(
        { institutionId },
        { $pull: { customFields: { k: field.internalKey } } },
      )
      .exec()
      .then((result) => {
        this.logger.log(
          `Cleaned up customFields.${field.internalKey} from ${result.modifiedCount} ${field.entityType} record(s)`,
        );
      })
      .catch((err: Error) => {
        this.logger.error(
          `customFields cleanup failed for ${field.internalKey}: ${err.message}`,
        );
      });
  }

  private modelForEntityType(
    entityType: FieldEntityType,
  ): Model<CustomFieldsHolder> {
    switch (entityType) {
      case FieldEntityType.Participant:
        return this.participantModel;
      case FieldEntityType.Staff:
        return this.staffModel;
      case FieldEntityType.Group:
        return this.groupModel;
    }
  }

  /** Spec section 32: block type change if any existing value is incompatible. No partial conversion. */
  private async assertTypeChangeSafe(
    field: FieldDefinitionDocument,
    newType: FieldType,
  ): Promise<void> {
    const model = this.modelForEntityType(field.entityType);
    const holders = await model
      .find({
        institutionId: field.institutionId,
        'customFields.k': field.internalKey,
      })
      .select('customFields')
      .exec();

    const activeValues =
      newType === FieldType.Select || newType === FieldType.MultiSelect
        ? await this.fieldOptionsService.activeValues(
            field.institutionId.toString(),
            field._id.toString(),
          )
        : undefined;

    let incompatible = 0;
    for (const holder of holders) {
      const entry = holder.customFields.find((c) => c.k === field.internalKey);
      if (entry && !isValueCompatibleWithType(newType, entry.v, activeValues)) {
        incompatible += 1;
      }
    }

    if (incompatible > 0) {
      throw AppError.conflict(
        `Cannot change field type: ${incompatible} existing record(s) have an incompatible value. ` +
          'Fix or clear the values first, or create a new field instead.',
        'INCOMPATIBLE_FIELD_TYPE_CHANGE',
      );
    }
  }

  /**
   * Spec section 31: before applying required=true, count existing records
   * missing a value and require the administrator to explicitly confirm
   * (Option A — enforce for new/future edits only) or fill the data first
   * (Option B — retry once the count reaches zero, no confirmation needed).
   */
  private async assertRequiredChangeSafe(
    field: FieldDefinitionDocument,
    confirmed: boolean,
  ): Promise<void> {
    const model = this.modelForEntityType(field.entityType);
    const missingCount = await model
      .countDocuments({
        institutionId: field.institutionId,
        'customFields.k': { $ne: field.internalKey },
      })
      .exec();

    if (missingCount > 0 && !confirmed) {
      throw AppError.conflict(
        `${missingCount} existing ${field.entityType} record(s) have no value for "${field.displayName}". ` +
          'Resend with confirmRequiredChange:true to enforce required only for new/future edits (Option A), ' +
          'or fill in the missing values first and retry (Option B).',
        'REQUIRED_CHANGE_NEEDS_CONFIRMATION',
      );
    }
  }

  private async generateUniqueInternalKey(
    institutionId: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `field_${randomBytes(6).toString('hex')}`;
      const exists = await this.fieldDefinitionModel
        .exists({ institutionId, internalKey: candidate })
        .exec();
      if (!exists) return candidate;
    }
    throw new Error('Failed to generate a unique internalKey after 5 attempts');
  }
}
