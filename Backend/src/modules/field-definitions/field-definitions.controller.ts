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
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { QueryFieldDefinitionsDto } from './dto/query-field-definitions.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';
import { FieldDefinitionsService } from './field-definitions.service';

/** Spec sections 25-32, 80-82 — Administrator only. */
@Roles(Role.Admin)
@CheckAbility('manage', 'FieldDefinition')
@Controller('field-definitions')
export class FieldDefinitionsController {
  constructor(
    private readonly fieldDefinitionsService: FieldDefinitionsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFieldDefinitionDto,
  ) {
    return this.fieldDefinitionsService.create(
      this.requireInstitution(user),
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFieldDefinitionsDto,
  ) {
    return this.fieldDefinitionsService.findAll(
      this.requireInstitution(user),
      query,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fieldDefinitionsService.findOne(
      id,
      this.requireInstitution(user),
    );
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFieldDefinitionDto,
  ) {
    return this.fieldDefinitionsService.update(
      id,
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
    await this.fieldDefinitionsService.remove(
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
