import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CustomFieldEntryDto } from '../../../common/dto/custom-field-entry.dto';
import { FieldEntityType } from '../../../common/enums';

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

  /**
   * Which entity to create on approval. Defaults to Participant (original
   * behavior). Group is deliberately not a valid value here — restricted at
   * the DTO/validation level rather than reusing the full FieldEntityType
   * enum, since self-registration only makes sense for a person joining as
   * a learner or a staff member, never a Group.
   */
  @IsOptional()
  @IsIn([FieldEntityType.Participant, FieldEntityType.Staff])
  entityType?: FieldEntityType.Participant | FieldEntityType.Staff;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldEntryDto)
  customFields?: CustomFieldEntryDto[];
}
