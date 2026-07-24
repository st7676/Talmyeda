import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums';

/**
 * Admin-driven user creation. Spec sections 70, 70.1.
 * Only STAFF / PARTICIPANT logins are created here; ADMIN is created via
 * institution registration and SUPER_ADMIN is provisioned out of band.
 */
export class CreateUserDto {
  @IsString()
  username: string;

  /** Optional — if omitted the system generates a temporary password. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsEnum(Role, { message: 'role must be STAFF or PARTICIPANT' })
  role: Role.Staff | Role.Participant;

  @IsOptional()
  @IsString()
  participantId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}
