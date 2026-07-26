import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Spec section 15: a User is created "if institution settings require it".
 * For participantUserMode = 'always' a User is always created; for 'never'
 * one is never created. For 'optional' the spec doesn't say who decides —
 * documented open decision: the approving Administrator decides per request
 * via this flag (default false, i.e. no login unless explicitly requested).
 */
export class ApproveRegistrationRequestDto {
  @IsOptional()
  @IsBoolean()
  createUser?: boolean;
}
