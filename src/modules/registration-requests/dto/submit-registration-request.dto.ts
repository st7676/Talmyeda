import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CustomFieldEntryDto } from '../../../common/dto/custom-field-entry.dto';

/**
 * Spec section 84 (Submit Registration Request). The submitter is not yet
 * authenticated (spec 13: they may not exist as a Participant/User at all),
 * so — unlike every other DTO in this codebase — institutionId must travel
 * in the body here. This is a deliberate, narrow exception to spec section
 * 91 ("never trust institutionId from the client"): there is no JWT to take
 * it from, and the request only ever creates a Pending RegistrationRequest,
 * never business data. See PROGRESS.md open decisions.
 */
export class SubmitRegistrationRequestDto {
  @IsString()
  institutionId: string;

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
