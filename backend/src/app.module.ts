import { Module } from '@nestjs/common';
import { AvailabilityModule } from './availability/availability.module';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createValidationPipe } from './common/pipes/validation.pipe';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { GuestsModule } from './guests/guests.module';
import { HealthModule } from './health/health.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { ContactModule } from './contact/contact.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    AvailabilityModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    GuestsModule,
    RoomTypesModule,
    ContactModule,
    BookingsModule,
    // Further feature modules (bookings, payments, ...) are added here.
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class AppModule {}
