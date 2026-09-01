import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { AuthenticatedUser, PaginatedResult } from '../../common/interfaces';
import { UsersService } from '../users/users.service';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
  ) {}

  /** POST /messages — PARTICIPANT/STAFF sends a message to their institution's admins. */
  async send(
    user: AuthenticatedUser,
    dto: SendMessageDto,
  ): Promise<MessageDocument> {
    const institutionId = this.requireInstitution(user);
    if (user.role !== Role.Participant && user.role !== Role.Staff) {
      throw AppError.forbidden(
        'Only participants and staff can send messages',
        'FORBIDDEN_ROLE',
      );
    }
    // username isn't in the JWT (spec 67), so fetch it once here rather
    // than making the frontend pass along a value it can't be trusted to
    // report honestly.
    const record = await this.usersService.findByIdForAuth(user.userId);
    if (!record) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    return this.messageModel.create({
      institutionId,
      fromUserId: user.userId,
      fromRole: user.role,
      fromUsername: record.username,
      body: dto.body,
    });
  }

  /** GET /messages — Admin inbox for the institution. */
  async findAll(
    institutionId: string,
    query: QueryMessagesDto,
  ): Promise<PaginatedResult<MessageDocument>> {
    const { page, limit, unreadOnly } = query;
    const filter: Record<string, unknown> = { institutionId };
    if (unreadOnly) filter.isRead = false;

    const [items, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  /** GET /messages/mine — a PARTICIPANT/STAFF member's own sent messages. */
  async findMine(
    user: AuthenticatedUser,
    query: QueryMessagesDto,
  ): Promise<PaginatedResult<MessageDocument>> {
    const institutionId = this.requireInstitution(user);
    const { page, limit } = query;
    const filter = { institutionId, fromUserId: user.userId };

    const [items, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);
    return { items, page, limit, total };
  }

  /** GET /messages/unread-count — for a nav badge. */
  countUnread(institutionId: string): Promise<number> {
    return this.messageModel
      .countDocuments({ institutionId, isRead: false })
      .exec();
  }

  /** POST /messages/:id/read — Admin marks a message read. */
  async markRead(id: string, institutionId: string): Promise<MessageDocument> {
    const message = await this.messageModel
      .findOneAndUpdate(
        { _id: id, institutionId },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .exec();
    if (!message)
      throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
    return message;
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
}
