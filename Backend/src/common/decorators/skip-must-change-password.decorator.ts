import { SetMetadata } from '@nestjs/common';

export const SKIP_MUST_CHANGE_PASSWORD_KEY = 'skipMustChangePassword';

/**
 * Exempts a route from the mustChangePassword block (spec section 70.1).
 * Apply this to the password-change endpoint itself — otherwise a user who
 * must change their password could never reach the one route that lets
 * them do it.
 */
export const SkipMustChangePasswordCheck = () =>
  SetMetadata(SKIP_MUST_CHANGE_PASSWORD_KEY, true);
