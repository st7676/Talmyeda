import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicFieldsModule } from '../dynamic-fields/dynamic-fields.module';
import {
  StaffGroup,
  StaffGroupSchema,
} from '../staff-groups/schemas/staff-group.schema';
import { UsersModule } from '../users/users.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff, StaffSchema } from './schemas/staff.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      // Raw schema registration (not importing StaffGroupsModule) — same
      // pattern ParticipantsModule already uses for ParticipantGroup/
      // StaffGroup, avoids a circular import since StaffGroupsModule
      // imports StaffModule.
      { name: StaffGroup.name, schema: StaffGroupSchema },
    ]),
    DynamicFieldsModule,
    UsersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
