import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicFieldsModule } from '../dynamic-fields/dynamic-fields.module';
import { FieldDefinitionsModule } from '../field-definitions/field-definitions.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ParticipantsModule } from '../participants/participants.module';
import { StaffModule } from '../staff/staff.module';
import { UsersModule } from '../users/users.module';
import { RegistrationRequestsController } from './registration-requests.controller';
import { RegistrationRequestsService } from './registration-requests.service';
import {
  RegistrationRequest,
  RegistrationRequestSchema,
} from './schemas/registration-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistrationRequest.name, schema: RegistrationRequestSchema },
    ]),
    InstitutionsModule,
    ParticipantsModule,
    StaffModule,
    UsersModule,
    DynamicFieldsModule,
    FieldDefinitionsModule,
  ],
  controllers: [RegistrationRequestsController],
  providers: [RegistrationRequestsService],
  exports: [RegistrationRequestsService],
})
export class RegistrationRequestsModule {}
