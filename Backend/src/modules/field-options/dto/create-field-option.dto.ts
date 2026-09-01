import { IsInt, IsOptional, IsString } from 'class-validator';

/** Spec section 83. For Select and MultiSelect FieldDefinitions. */
export class CreateFieldOptionDto {
  @IsString()
  fieldId: string;

  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
