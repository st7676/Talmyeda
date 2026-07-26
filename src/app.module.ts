import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CaslModule } from './modules/casl/casl.module';
import { CaslAbilityGuard } from './modules/casl/guards/casl-ability.guard';
import { GroupsModule } from './modules/groups/groups.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { ParticipantGroupsModule } from './modules/participant-groups/participant-groups.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { RegistrationRequestsModule } from './modules/registration-requests/registration-requests.module';
import { StaffGroupsModule } from './modules/staff-groups/staff-groups.module';
import { StaffModule } from './modules/staff/staff.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    CaslModule,
    AuthModule,
    UsersModule,
    InstitutionsModule,
    GroupsModule,
    ParticipantsModule,
    StaffModule,
    ParticipantGroupsModule,
    StaffGroupsModule,
    RegistrationRequestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authenticate, then coarse role gate, then CASL entity check. Spec section 64, 93.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CaslAbilityGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
