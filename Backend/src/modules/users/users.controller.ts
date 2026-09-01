import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  Roles,
  SkipMustChangePasswordCheck,
} from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { FieldEntityType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fieldDefinitionsService: FieldDefinitionsService,
  ) {}

  /** Any authenticated user changes their own password (spec 70.1). Must precede :id routes. */
  @SkipMustChangePasswordCheck()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { changed: true };
  }

  /** POST /users — spec 70, 70.1. Returns the temp password once. */
  @Roles(Role.Admin)
  @Post()
  async create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    const institutionId = this.requireInstitution(admin);
    const { user, tempPassword } = await this.usersService.create(
      dto,
      institutionId,
    );
    return {
      id: user._id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      tempPassword,
    };
  }

  @Roles(Role.Admin)
  @Get()
  findAll(
    @CurrentUser() admin: AuthenticatedUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.usersService.findAll(
      this.requireInstitution(admin),
      pagination,
    );
  }

  /**
   * Any authenticated user (any role) reads their own User record — the only
   * way the frontend can discover its own linked participantId/staffId,
   * since those aren't in the JWT. Must precede the `:id` route below or
   * Nest would match "me" as an :id param instead.
   */
  @Get('me')
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.userId);
  }

  /**
   * GET /users/me/fields — any authenticated PARTICIPANT/STAFF gets back
   * the custom-field metadata they're allowed to self-edit (same shape and
   * permission logic as the public join form, see FieldDefinitionsService.
   * findSelfEditableFields). Real gap this closes: "אני רוצה שמשתמש יוכל
   * לערוך את השדות שלו" — MyProfilePage previously showed customFields
   * read-only because rendering a proper typed editor requires field
   * metadata, and GET /field-definitions + GET /field-options are both
   * Admin-only. entityType is derived from the caller's own role, never
   * accepted from the client — asking to edit "Staff" fields while logged
   * in as a Participant makes no sense and isn't exposed as an option.
   * Path is 3 segments (me/fields) so it can never collide with the
   * 2-segment `:id` route below regardless of declaration order.
   */
  @Get('me/fields')
  getMyFields(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== Role.Participant && user.role !== Role.Staff) return [];
    const entityType =
      user.role === Role.Staff
        ? FieldEntityType.Staff
        : FieldEntityType.Participant;
    return this.fieldDefinitionsService.findSelfEditableFields(
      this.requireInstitution(user),
      entityType,
      user.role,
    );
  }

  @Roles(Role.Admin)
  @Get(':id')
  findOne(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.findOne(id, this.requireInstitution(admin));
  }

  @Roles(Role.Admin)
  @Put(':id')
  update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, this.requireInstitution(admin), dto);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.usersService.softDelete(id, this.requireInstitution(admin));
    return { deleted: true };
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
