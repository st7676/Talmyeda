import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsModule } from '../groups/groups.module';
import { ParticipantsModule } from '../participants/participants.module';
import { ParticipantGroupsController } from './participant-groups.controller';
import { ParticipantGroupsService } from './participant-groups.service';
import {
  ParticipantGroup,
  ParticipantGroupSchema,
} from './schemas/participant-group.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ParticipantGroup.name, schema: ParticipantGroupSchema },
    ]),
    ParticipantsModule,
    GroupsModule,
  ],
  controllers: [ParticipantGroupsController],
  providers: [ParticipantGroupsService],
  exports: [ParticipantGroupsService],
})
export class ParticipantGroupsModule {}
