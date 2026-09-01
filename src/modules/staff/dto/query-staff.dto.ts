import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Spec sections 38-40: dynamic-field filter/sort, mirroring
 * QueryParticipantsDto. `filters` is a JSON-encoded object mapping
 * FieldDefinition.internalKey -> exact value to match, e.g.
 * `?filters={"field_a83kd9":"Jerusalem"}`. Only fields marked filterable
 * (spec 39) may appear here; enforced in the service since it requires an
 * institution-scoped FieldDefinition lookup.
 */
export class QueryStaffDto extends PaginationQueryDto {
  /** Free-text search across firstName/lastName (spec 72, 85), case-insensitive substring match. */
  @IsOptional()
  @IsString()
  search?: string;

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

  /**
   * Filter to active members of one group (mirrors QueryParticipantsDto's
   * groupId, added at the same time for the same reason — there was
   * previously no way to list "who's in this group" for Staff at all, only
   * Participants).
   */
  @IsOptional()
  @IsString()
  groupId?: string;
}
