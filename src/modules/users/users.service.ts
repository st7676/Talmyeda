import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AccountStatus, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { PaginatedResult } from '../../common/interfaces';
import {
  generateTempPassword,
  hashPassword,
  verifyPassword,
} from '../../common/utils/password.util';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Low-level creation used internally (e.g. institution registration creating
   * the first ADMIN). Caller supplies an already-hashed password.
   */
  async createRaw(
    data: {
      institutionId: Types.ObjectId | string | null;
      username: string;
      passwordHash: string;
      role: Role;
      participantId?: Types.ObjectId | string | null;
      staffId?: Types.ObjectId | string | null;
      mustChangePassword?: boolean;
    },
    session?: ClientSession,
  ): Promise<UserDocument> {
    await this.assertUsernameFree(data.institutionId, data.username, session);
    const docs = await this.userModel.create(
      [
        {
          institutionId: data.institutionId ?? null,
          username: data.username,
          passwordHash: data.passwordHash,
          role: data.role,
          participantId: data.participantId ?? null,
          staffId: data.staffId ?? null,
          mustChangePassword: data.mustChangePassword ?? true,
        },
      ],
      { session },
    );
    return docs[0];
  }

  /**
   * Admin-driven creation of a STAFF/PARTICIPANT login (spec 70, 70.1).
   * Returns the temporary password exactly once for the admin to hand over.
   */
  async create(
    dto: CreateUserDto,
    institutionId: string,
  ): Promise<{ user: UserDocument; tempPassword: string }> {
    if (dto.role !== Role.Staff && dto.role !== Role.Participant) {
      throw AppError.validation(
        'Only STAFF or PARTICIPANT users can be created here',
      );
    }
    const plain = dto.password ?? generateTempPassword();
    const passwordHash = await hashPassword(plain);
    const user = await this.createRaw({
      institutionId,
      username: dto.username,
      passwordHash,
      role: dto.role,
      participantId: dto.participantId,
      staffId: dto.staffId,
      mustChangePassword: true,
    });
    return { user, tempPassword: plain };
  }

  /** Login lookup: all active, non-deleted users matching a username (spec 66). */
  findActiveByUsername(username: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ username, status: AccountStatus.Active, isDeleted: false })
      .exec();
  }

  findByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  async findAll(
    institutionId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<UserDocument>> {
    const { page, limit } = pagination;
    const filter = { institutionId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  async findOne(id: string, institutionId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: id, institutionId, isDeleted: false })
      .select('-passwordHash')
      .exec();
    if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    return user;
  }

  async update(
    id: string,
    institutionId: string,
    dto: UpdateUserDto,
  ): Promise<UserDocument> {
    const update: Record<string, unknown> = {};
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.participantId !== undefined)
      update.participantId = dto.participantId;
    if (dto.staffId !== undefined) update.staffId = dto.staffId;
    if (dto.password !== undefined) {
      update.passwordHash = await hashPassword(dto.password);
      update.mustChangePassword = true;
    }

    const user = await this.userModel
      .findOneAndUpdate({ _id: id, institutionId, isDeleted: false }, update, {
        new: true,
      })
      .select('-passwordHash')
      .exec();
    if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    return user;
  }

  /** Marks every user of an institution as Rejected. Spec section 69.1 (reject flow). */
  async rejectAllForInstitution(institutionId: string): Promise<void> {
    await this.userModel
      .updateMany({ institutionId }, { status: AccountStatus.Rejected })
      .exec();
  }

  /** Soft delete. Spec sections 59, 70. */
  async softDelete(id: string, institutionId: string): Promise<void> {
    const res = await this.userModel
      .findOneAndUpdate(
        { _id: id, institutionId, isDeleted: false },
        {
          isDeleted: true,
          deletedAt: new Date(),
          status: AccountStatus.Inactive,
        },
      )
      .exec();
    if (!res) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  /** First-login / self-service password change. Spec section 70.1. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel
      .findOne({ _id: userId, isDeleted: false })
      .exec();
    if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok)
      throw AppError.unauthorized(
        'Current password is incorrect',
        'INVALID_PASSWORD',
      );
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
  }

  private async assertUsernameFree(
    institutionId: Types.ObjectId | string | null,
    username: string,
    session?: ClientSession,
  ): Promise<void> {
    const existing = await this.userModel
      .findOne({
        institutionId: institutionId ?? null,
        username,
        isDeleted: false,
      })
      .session(session ?? null)
      .exec();
    if (existing) {
      throw AppError.conflict(
        'Username already exists in this institution',
        'USERNAME_TAKEN',
      );
    }
  }
}
