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
import { CreateFieldOptionDto } from './dto/create-field-option.dto';
import { UpdateFieldOptionDto } from './dto/update-field-option.dto';
import { FieldOptionsService } from './field-options.service';

/** Spec section 83 — Administrator only. */
@Roles(Role.Admin)
@CheckAbility('manage', 'FieldOption')
@Controller('field-options')
export class FieldOptionsController {
  constructor(private readonly fieldOptionsService: FieldOptionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFieldOptionDto,
  ) {
    return this.fieldOptionsService.create(this.requireInstitution(user), dto);
  }

  @Get()
  findForField(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fieldId') fieldId: string,
  ) {
    return this.fieldOptionsService.findForField(
      this.requireInstitution(user),
      fieldId,
    );
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFieldOptionDto,
  ) {
    return this.fieldOptionsService.update(
      id,
      this.requireInstitution(user),
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.fieldOptionsService.disable(id, this.requireInstitution(user));
    return { disabled: true };
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
