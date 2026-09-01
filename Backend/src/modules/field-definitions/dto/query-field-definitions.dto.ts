import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FieldEntityType } from '../../../common/enums';

/** Spec section 81: "Fields for requested entity." */
export class QueryFieldDefinitionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FieldEntityType)
  entityType?: FieldEntityType;
}
