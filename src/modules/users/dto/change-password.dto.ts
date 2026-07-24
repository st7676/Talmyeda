import { IsString, MinLength } from 'class-validator';

/** First-login / self-service password change. Spec section 70.1. */
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
