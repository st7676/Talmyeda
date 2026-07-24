import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 12;

/** Hash a plaintext password. Passwords are never stored in plain text (spec 68, 90). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Generates a temporary password handed to the admin once (spec section 70.1). */
export function generateTempPassword(): string {
  // URL-safe, ~12 chars, enough entropy for a one-time credential.
  return randomBytes(9).toString('base64url');
}
