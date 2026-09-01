import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FieldOptionsModule } from '../field-options/field-options.module';
import { Group, GroupSchema } from '../groups/schemas/group.schema';
import {
  Participant,
  ParticipantSchema,
} from '../participants/schemas/participant.schema';
import { Staff, StaffSchema } from '../staff/schemas/staff.schema';
import { FieldDefinitionsController } from './field-definitions.controller';
import { FieldDefinitionsService } from './field-definitions.service';
import {
  FieldDefinition,
  FieldDefinitionSchema,
} from './schemas/field-definition.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FieldDefinition.name, schema: FieldDefinitionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Staff.name, schema: StaffSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    FieldOptionsModule,
  ],
  controllers: [FieldDefinitionsController],
  providers: [FieldDefinitionsService],
  exports: [FieldDefinitionsService],
})
export class FieldDefinitionsModule {}
