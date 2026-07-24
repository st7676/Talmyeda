import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { PlatformController } from './platform.controller';
import { Institution, InstitutionSchema } from './schemas/institution.schema';
import {
  InstitutionSettings,
  InstitutionSettingsSchema,
} from './schemas/institution-settings.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Institution.name, schema: InstitutionSchema },
      { name: InstitutionSettings.name, schema: InstitutionSettingsSchema },
    ]),
  ],
  controllers: [InstitutionsController, PlatformController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
