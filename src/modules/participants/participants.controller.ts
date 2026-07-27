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
import { CheckAbility } from '../casl/decorators/check-ability.decorator';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { QueryParticipantsDto } from './dto/query-participants.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantsService } from './participants.service';

/** Spec sections 71-75. Entity-level gate via CASL; group-scoping inside the service. */
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Roles(Role.Admin, Role.Staff)
  @CheckAbility('create', 'Participant')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.participantsService.create(
      this.requireInstitution(user),
      dto,
      user.role,
    );
  }

  @Roles(Role.Admin, Role.Staff)
  @CheckAbility('read', 'Participant')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryParticipantsDto,
  ) {
    return this.participantsService.findAll(user, query);
  }

  @CheckAbility('read', 'Participant')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.participantsService.findOne(id, user);
  }

  @CheckAbility('update', 'Participant')
  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(id, user, dto);
  }

  @Roles(Role.Admin)
  @CheckAbility('delete', 'Participant')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.participantsService.softDelete(
      id,
      this.requireInstitution(user),
    );
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
