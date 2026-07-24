import { PartialType } from '@nestjs/mapped-types';
import { CreateParticipantDto } from './create-participant.dto';

/** Spec section 74. */
export class UpdateParticipantDto extends PartialType(CreateParticipantDto) {}
