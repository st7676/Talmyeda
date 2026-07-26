import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, ValidateNested } from 'class-validator';

export class RolePermissionDto {
  @IsOptional()
  @IsBoolean()
  view?: boolean;

  @IsOptional()
  @IsBoolean()
  edit?: boolean;
}

/**
 * Spec section 21: the matrix only governs staff/participant. ADMIN always
 * has full access regardless — there is no `admin` key here by design.
 */
export class FieldPermissionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => RolePermissionDto)
  staff?: RolePermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RolePermissionDto)
  participant?: RolePermissionDto;
}

export class DisplaySettingsDto {
  @IsOptional()
  @IsBoolean()
  showInList?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class SearchSettingsDto {
  @IsOptional()
  @IsBoolean()
  searchable?: boolean;

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  sortable?: boolean;
}
