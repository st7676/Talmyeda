import { IsString, MinLength } from 'class-validator';

/** Initial institution creation. Spec section 69. */
export class RegisterInstitutionDto {
  @IsString()
  institutionName: string;

  @IsString()
  adminUsername: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;
}
