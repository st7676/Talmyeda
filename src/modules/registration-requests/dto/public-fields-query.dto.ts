import { IsIn, IsString } from 'class-validator';
import { FieldEntityType } from '../../../common/enums';

/**
 * GET /registration-requests/fields — public, unauthenticated. Lets the
 * self-registration form render the institution's configured custom fields
 * (spec 35-37) without needing an admin session. Same institutionId-in-query
 * exception as SubmitRegistrationRequestDto (no JWT exists yet for this
 * caller); the service still verifies the institution is Active and has
 * self-registration enabled before returning anything (same guard as
 * submit()), so this can't be used to probe arbitrary/inactive institutions.
 */
export class PublicFieldsQueryDto {
  @IsString()
  institutionId: string;

  @IsIn([FieldEntityType.Participant, FieldEntityType.Staff])
  entityType: FieldEntityType.Participant | FieldEntityType.Staff;
}
