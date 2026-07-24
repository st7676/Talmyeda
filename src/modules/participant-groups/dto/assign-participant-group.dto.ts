import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Spec section 78. */
export class AssignParticipantGroupDto {
  @IsString()
  participantId: string;

  @IsString()
  groupId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
