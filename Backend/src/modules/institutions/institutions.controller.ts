import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import type { AuthenticatedUser } from '../../common/interfaces';
import { InstitutionsService } from './institutions.service';
import { RegisterInstitutionDto } from './dto/register-institution.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  /** POST /institutions/register — spec section 69. Public. */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterInstitutionDto) {
    return this.institutionsService.register(dto);
  }

  /** GET /institutions/me — spec section 69. Administrator only. */
  @Roles(Role.Admin)
  @Get('me')
  getMe(@CurrentUser() admin: AuthenticatedUser) {
    return this.institutionsService.getMe(this.requireInstitution(admin));
  }

  /** PUT /institutions/settings — spec section 69. Administrator only. */
  @Roles(Role.Admin)
  @Put('settings')
  updateSettings(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.institutionsService.updateSettings(
      this.requireInstitution(admin),
      dto,
    );
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
