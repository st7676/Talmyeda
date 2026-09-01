import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InstitutionStatus } from '../../../common/enums';

/**
 * GET /platform/institutions?status=Pending. Bundled with pagination into one
 * DTO (matching QueryRegistrationRequestsDto's pattern) because the global
 * ValidationPipe runs with forbidNonWhitelisted: true — splitting `status`
 * into a separate @Query('status') while pagination stays a whitelisted DTO
 * makes the DTO reject the request for having an "unknown" status property.
 */
export class QueryInstitutionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InstitutionStatus)
  status?: InstitutionStatus;
}
