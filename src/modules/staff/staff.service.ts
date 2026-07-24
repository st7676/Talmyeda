import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff, StaffDocument } from './schemas/staff.schema';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
  ) {}

  create(institutionId: string, dto: CreateStaffDto): Promise<StaffDocument> {
    return this.staffModel.create({
      institutionId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields: dto.customFields ?? [],
    });
  }

  async findAll(
    institutionId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<StaffDocument>> {
    const { page, limit } = pagination;
    const filter = { institutionId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.staffModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.staffModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  async findOne(id: string, institutionId: string): Promise<StaffDocument> {
    const staff = await this.staffModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .exec();
    if (!staff) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
    return staff;
  }

  async update(
    id: string,
    institutionId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffDocument> {
    const staff = await this.staffModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!staff) throw AppError.notFound('Staff not found', 'STAFF_NOT_FOUND');
    return staff;
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
