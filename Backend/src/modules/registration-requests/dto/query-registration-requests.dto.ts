import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RegistrationRequestStatus } from '../schemas/registration-request.schema';

/** Spec section 84 (View Requests). */
export class QueryRegistrationRequestsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RegistrationRequestStatus)
  status?: RegistrationRequestStatus;
}
