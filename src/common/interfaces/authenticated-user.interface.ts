import { Role } from '../enums';

/**
 * The authenticated principal attached to every request by JwtAuthGuard.
 * Mirrors the JWT payload (spec section 67). institutionId is null only for
 * SUPER_ADMIN, which is not tenant-scoped (spec sections 69.1, 302).
 */
export interface AuthenticatedUser {
  userId: string;
  institutionId: string | null;
  role: Role;
}
