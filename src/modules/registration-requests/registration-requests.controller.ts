import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { CheckAbility } from '../casl/decorators/check-ability.decorator';
import { ApproveRegistrationRequestDto } from './dto/approve-registration-request.dto';
import { QueryRegistrationRequestsDto } from './dto/query-registration-requests.dto';
import { SubmitRegistrationRequestDto } from './dto/submit-registration-request.dto';
import { RegistrationRequestsService } from './registration-requests.service';

/** Spec sections 13-15, 84. */
@Controller('registration-requests')
export class RegistrationRequestsController {
  constructor(
    private readonly registrationRequestsService: RegistrationRequestsService,
  ) {}

  /**
   * POST /registration-requests — public, unauthenticated submitters (spec 13).
   * Rate-limited per IP to prevent spam submissions (spec 90.1).
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  submit(@Body() dto: SubmitRegistrationRequestDto) {
    return this.registrationRequestsService.submit(dto);
  }

  /** GET /registration-requests — Administrator only (spec 84). */
  @Roles(Role.Admin)
  @CheckAbility('read', 'RegistrationRequest')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryRegistrationRequestsDto,
  ) {
    return this.registrationRequestsService.findAll(
      this.requireInstitution(user),
      query,
    );
  }

  @Roles(Role.Admin)
  @CheckAbility('update', 'RegistrationRequest')
  @Post(':id/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationRequestDto,
  ) {
    return this.registrationRequestsService.approve(
      id,
      this.requireInstitution(user),
      dto,
    );
  }

  @Roles(Role.Admin)
  @CheckAbility('update', 'RegistrationRequest')
  @Post(':id/reject')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.registrationRequestsService.reject(
      id,
      this.requireInstitution(user),
    );
    return { rejected: true };
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
