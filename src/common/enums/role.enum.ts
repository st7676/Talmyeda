/**
 * User roles. Spec sections 8, 302.
 * The three institution-scoped roles plus the platform-level SUPER_ADMIN,
 * which is NOT scoped by institutionId (section 69.1, 302).
 */
export enum Role {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  Staff = 'STAFF',
  Participant = 'PARTICIPANT',
}
