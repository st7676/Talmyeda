import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstitutionsModule } from '../institutions/institutions.module';
import {
  ParticipantGroup,
  ParticipantGroupSchema,
} from '../participant-groups/schemas/participant-group.schema';
import {
  StaffGroup,
  StaffGroupSchema,
} from '../staff-groups/schemas/staff-group.schema';
import { UsersModule } from '../users/users.module';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { Participant, ParticipantSchema } from './schemas/participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
      { name: ParticipantGroup.name, schema: ParticipantGroupSchema },
      { name: StaffGroup.name, schema: StaffGroupSchema },
    ]),
    InstitutionsModule,
    UsersModule,
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
