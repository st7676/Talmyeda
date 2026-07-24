import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { AssignStaffGroupDto } from './dto/assign-staff-group.dto';
import { StaffGroupsService } from './staff-groups.service';

/** Spec section 79 — Administrator only. */
@Roles(Role.Admin)
@Controller('staff-groups')
export class StaffGroupsController {
  constructor(private readonly staffGroupsService: StaffGroupsService) {}

  @Post()
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignStaffGroupDto,
  ) {
    return this.staffGroupsService.assign(this.requireInstitution(user), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.staffGroupsService.remove(id, this.requireInstitution(user));
    return { removed: true };
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
