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
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

/** Spec section 76 — Administrator only. */
@Roles(Role.Admin)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.staffService.create(
      this.requireInstitution(user),
      dto,
      user.role,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStaffDto,
  ) {
    return this.staffService.findAll(
      this.requireInstitution(user),
      query,
      user.role,
    );
  }

  /**
   * Self-view added here: previously Admin-only, meaning a STAFF-role user
   * had no way at all to see their own record — unlike Participant, which
   * already supported self-view/edit. Access to a *specific* record (own
   * vs. someone else's) is enforced in StaffService.findOneRaw, same
   * pattern as ParticipantsService.
   */
  @Roles(Role.Admin, Role.Staff)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.staffService.findOne(id, user);
  }

  /** Self-edit added here for the same reason as findOne above. */
  @Roles(Role.Admin, Role.Staff)
  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.staffService.softDelete(id, this.requireInstitution(user));
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
