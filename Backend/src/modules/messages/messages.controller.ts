import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessagesService } from './messages.service';

/**
 * New feature (no prior spec coverage) — a minimal one-way "contact the
 * admin" inbox. See schemas/message.schema.ts for scope rationale.
 */
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Roles(Role.Participant, Role.Staff)
  @Post()
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.messagesService.send(user, dto);
  }

  /** GET /messages/mine — must precede GET /messages/:id-style routes if any are ever added. */
  @Roles(Role.Participant, Role.Staff)
  @Get('mine')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.findMine(user, query);
  }

  @Roles(Role.Admin)
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService
      .countUnread(this.requireInstitution(user))
      .then((count) => ({ count }));
  }

  @Roles(Role.Admin)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.findAll(this.requireInstitution(user), query);
  }

  @Roles(Role.Admin)
  @Post(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagesService.markRead(id, this.requireInstitution(user));
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
