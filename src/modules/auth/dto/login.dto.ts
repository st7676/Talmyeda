import { IsString } from 'class-validator';

/** Login credentials. Spec section 66. */
export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
