import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ParticipantUserMode } from '../schemas/institution-settings.schema';

/** Update institution configuration. Spec section 69 (Update Institution Settings). */
export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(ParticipantUserMode)
  participantUserMode?: ParticipantUserMode;

  @IsOptional()
  @IsBoolean()
  selfRegistrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultipleGroups?: boolean;

  @IsOptional()
  @IsBoolean()
  staffGroupManagementEnabled?: boolean;
}
