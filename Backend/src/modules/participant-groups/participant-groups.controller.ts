import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { AssignParticipantGroupDto } from './dto/assign-participant-group.dto';
import { ListByGroupQueryDto } from './dto/list-by-group-query.dto';
import { ParticipantGroupsService } from './participant-groups.service';

/** Spec section 78 — Administrator (staff assignment mirrors participant creation permission). */
@Roles(Role.Admin)
@Controller('participant-groups')
export class ParticipantGroupsController {
  constructor(
    private readonly participantGroupsService: ParticipantGroupsService,
  ) {}

  @Post()
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignParticipantGroupDto,
  ) {
    return this.participantGroupsService.assign(
      this.requireInstitution(user),
      dto,
    );
  }

  /**
   * GET /participant-groups?groupId=X — the service method (findForGroup)
   * already existed but was never exposed by any route, so there was no way
   * to list a group's current participant members. Used by the frontend's
   * "manage members" dialog.
   */
  @Get()
  findForGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListByGroupQueryDto,
  ) {
    return this.participantGroupsService.findForGroup(
      this.requireInstitution(user),
      query.groupId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.participantGroupsService.deactivate(
      id,
      this.requireInstitution(user),
    );
    return { deactivated: true };
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
