import { IsOptional, IsString } from 'class-validator';

/** Spec section 79. */
export class AssignStaffGroupDto {
  @IsString()
  staffId: string;

  @IsString()
  groupId: string;

  @IsOptional()
  @IsString()
  roleDescription?: string;
}
