import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FieldType } from '../../../common/enums';
import {
  DisplaySettingsDto,
  FieldPermissionsDto,
  SearchSettingsDto,
} from './field-permissions.dto';

/**
 * Spec section 30, 82. entityType and internalKey are never editable
 * (spec 27) — not present here at all.
 */
export class UpdateFieldDefinitionDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  /**
   * Changing type requires validating every existing value (spec 32).
   * Included here as a regular field — the service does the heavy lifting.
   */
  @IsOptional()
  @IsEnum(FieldType)
  fieldType?: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  /**
   * Required for required:false->true when existing records already have
   * missing values (spec 31). Explicit acknowledgement of "Option A — leave
   * existing empty records as-is" — required is enforced going forward only.
   */
  @IsOptional()
  @IsBoolean()
  confirmRequiredChange?: boolean;

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
