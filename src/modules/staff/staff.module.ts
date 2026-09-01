import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicFieldsModule } from '../dynamic-fields/dynamic-fields.module';
import { UsersModule } from '../users/users.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff, StaffSchema } from './schemas/staff.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]),
    DynamicFieldsModule,
    UsersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
