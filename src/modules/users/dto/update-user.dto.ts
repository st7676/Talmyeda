import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AccountStatus } from '../../../common/enums';

/** Update a user. Spec section 70. */
export class UpdateUserDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  participantId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}
