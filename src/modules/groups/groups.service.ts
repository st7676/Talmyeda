import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FieldEntityType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { escapeRegex } from '../../common/utils/regex.util';
import { DynamicFieldsValidatorService } from '../dynamic-fields/dynamic-fields-validator.service';
import { DynamicQueryService } from '../dynamic-fields/dynamic-query.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group, GroupDocument } from './schemas/group.schema';

/** System (non-dynamic) fields sortable via a plain index-backed sort. Spec 60. */
const SYSTEM_SORT_FIELDS = new Set(['name', 'createdAt']);

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    private readonly dynamicFieldsValidator: DynamicFieldsValidatorService,
    private readonly dynamicQueryService: DynamicQueryService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateGroupDto,
    actingRole: Role = Role.Admin,
  ): Promise<GroupDocument> {
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Group,
      role: actingRole,
      customFields: dto.customFields ?? [],
    });
    return this.groupModel.create({
      institutionId,
      name: dto.name,
      customFields: dto.customFields ?? [],
    });
  }

  /** GET /groups — pagination plus dynamic-field filter/sort (spec 38-40, 77). */
  async findAll(
    institutionId: string,
    query: QueryGroupsDto,
    actingRole: Role = Role.Admin,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, search, filters, sortBy, sortDir } = query;
    const filter: Record<string, unknown> = { institutionId, isDeleted: false };
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: regex }];
    }
    const [{ items: rawItems, total }, viewableKeys] = await Promise.all([
      this.dynamicQueryService.findAll(
        this.groupModel,
        institutionId,
        FieldEntityType.Group,
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
        FieldEntityType.Group,
        actingRole,
      ),
    ]);
    const items = rawItems.map((doc) =>
      this.toReadable(
        doc as GroupDocument | Record<string, unknown>,
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
    const group = await this.groupModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!group) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
    const viewableKeys = await this.dynamicFieldsValidator.getViewableKeys(
      institutionId,
      FieldEntityType.Group,
      actingRole,
    );
    return this.toReadable(group, viewableKeys);
  }

  async update(
    id: string,
    institutionId: string,
    dto: UpdateGroupDto,
    actingRole: Role = Role.Admin,
  ): Promise<Record<string, unknown>> {
    await this.dynamicFieldsValidator.validate({
      institutionId,
      entityType: FieldEntityType.Group,
      role: actingRole,
      customFields: dto.customFields,
    });
    const group = await this.groupModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!group) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
    const viewableKeys = await this.dynamicFieldsValidator.getViewableKeys(
      institutionId,
      FieldEntityType.Group,
      actingRole,
    );
    return this.toReadable(group, viewableKeys);
  }

  /**
   * Applies field-level READ filtering (spec 21) to a document destined for
   * an API response. Accepts either a Mongoose document (from .find()) or a
   * plain object (from .aggregate(), used by dynamic-field sorting) since
   * aggregate results never have Mongoose document methods.
   */
  private toReadable(
    doc: GroupDocument | Record<string, unknown>,
    viewableKeys: Set<string> | null,
  ): Record<string, unknown> {
    const obj = (typeof (doc as GroupDocument).toObject === 'function'
      ? (doc as GroupDocument).toObject()
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
    const res = await this.groupModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
      )
      .exec();
    if (!res) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
  }

  /** Used by other modules (e.g. ParticipantGroup) to verify same-tenant references (spec 58.1). */
  async assertExists(id: string, institutionId: string): Promise<void> {
    const exists = await this.groupModel
      .exists({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!exists) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
  }
}
