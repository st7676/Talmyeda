import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Spec sections 72, 85, 38-40: system-field search + groupId filter, plus
 * dynamic-field filter/sort. `filters` is a JSON-encoded object mapping
 * FieldDefinition.internalKey -> exact value to match, e.g.
 * `?filters={"field_a83kd9":"Jerusalem"}`. Only fields marked filterable
 * (spec 39) may appear here; enforced in the service, not the DTO, since it
 * requires an institution-scoped FieldDefinition lookup.
 */
export class QueryParticipantsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  filters?: string;

  /** A system field name (firstName/lastName/createdAt) or a dynamic field's internalKey. */
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
