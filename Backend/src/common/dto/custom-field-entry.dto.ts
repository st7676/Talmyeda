import { IsDefined, IsString } from 'class-validator';

/**
 * One entry of the customFields Attribute Pattern array (spec section 35):
 * customFields: [{ k, v }]. Structural validation only — cross-checking
 * against FieldDefinition (type/required/permissions) is the Dynamic Schema
 * Engine's job (spec section 36), not yet implemented.
 */
export class CustomFieldEntryDto {
  @IsString()
  k: string;

  @IsDefined()
  v: unknown;
}
