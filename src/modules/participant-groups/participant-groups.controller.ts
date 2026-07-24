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
import { AssignParticipantGroupDto } from './dto/assign-participant-group.dto';
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
