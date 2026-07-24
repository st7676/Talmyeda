import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsModule } from '../groups/groups.module';
import { StaffModule } from '../staff/staff.module';
import { StaffGroupsController } from './staff-groups.controller';
import { StaffGroupsService } from './staff-groups.service';
import { StaffGroup, StaffGroupSchema } from './schemas/staff-group.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaffGroup.name, schema: StaffGroupSchema },
    ]),
    StaffModule,
    GroupsModule,
  ],
  controllers: [StaffGroupsController],
  providers: [StaffGroupsService],
  exports: [StaffGroupsService],
})
export class StaffGroupsModule {}
