import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { FieldDefinitionsModule } from './modules/field-definitions/field-definitions.module';
import { FieldOptionsModule } from './modules/field-options/field-options.module';
import { GroupsModule } from './modules/groups/groups.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { ParticipantGroupsModule } from './modules/participant-groups/participant-groups.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { RegistrationRequestsModule } from './modules/registration-requests/registration-requests.module';
import { StaffGroupsModule } from './modules/staff-groups/staff-groups.module';
import { StaffModule } from './modules/staff/staff.module';
import { MustChangePasswordGuard } from './modules/users/guards/must-change-password.guard';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    // Baseline rate limiting for every endpoint (spec section 90.1). Login
    // and self-registration get a stricter override via @Throttle() on
    // their own routes. In-memory storage — fine for a single instance,
    // would need a shared store (e.g. Redis) behind a load balancer.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    FieldOptionsModule,
    FieldDefinitionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters (spec section 64): rate limit first (cheapest, applies
    // even to unauthenticated requests) -> authenticate -> must-change-password
    // gate -> coarse role gate -> CASL entity check.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CaslAbilityGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
