import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group, GroupDocument } from './schemas/group.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
  ) {}

  create(institutionId: string, dto: CreateGroupDto): Promise<GroupDocument> {
    return this.groupModel.create({
      institutionId,
      name: dto.name,
      customFields: dto.customFields ?? [],
    });
  }

  async findAll(
    institutionId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<GroupDocument>> {
    const { page, limit } = pagination;
    const filter = { institutionId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.groupModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.groupModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  async findOne(id: string, institutionId: string): Promise<GroupDocument> {
    const group = await this.groupModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!group) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
    return group;
  }

  async update(
    id: string,
    institutionId: string,
    dto: UpdateGroupDto,
  ): Promise<GroupDocument> {
    const group = await this.groupModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!group) throw AppError.notFound('Group not found', 'GROUP_NOT_FOUND');
    return group;
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
