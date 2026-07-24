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
import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Any authenticated user changes their own password (spec 70.1). Must precede :id routes. */
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
