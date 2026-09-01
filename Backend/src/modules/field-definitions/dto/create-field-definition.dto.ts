import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FieldEntityType, FieldType } from '../../../common/enums';
import {
  DisplaySettingsDto,
  FieldPermissionsDto,
  SearchSettingsDto,
} from './field-permissions.dto';

/** Spec section 29, 80. Administrator only. */
export class CreateFieldDefinitionDto {
  @IsString()
  displayName: string;

  @IsEnum(FieldEntityType)
  entityType: FieldEntityType;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldPermissionsDto)
  permissions?: FieldPermissionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DisplaySettingsDto)
  displaySettings?: DisplaySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchSettingsDto)
  searchSettings?: SearchSettingsDto;
}
