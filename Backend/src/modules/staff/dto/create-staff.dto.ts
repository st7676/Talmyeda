import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CustomFieldEntryDto } from '../../../common/dto/custom-field-entry.dto';

/** Spec section 76. */
export class CreateStaffDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldEntryDto)
  customFields?: CustomFieldEntryDto[];
}
