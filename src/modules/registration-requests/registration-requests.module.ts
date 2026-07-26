import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ParticipantsModule } from '../participants/participants.module';
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
    UsersModule,
  ],
  controllers: [RegistrationRequestsController],
  providers: [RegistrationRequestsService],
  exports: [RegistrationRequestsService],
})
export class RegistrationRequestsModule {}
