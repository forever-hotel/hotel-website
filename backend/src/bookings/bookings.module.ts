import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { PromotionReference } from './entities/promotion-reference.entity';
import { Payment } from '../payments/entities/payment.entity';
import { GuestsModule } from '../guests/guests.module';
import { RoomTypesModule } from '../room-types/room-types.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingRepository } from '../database/repositories/booking.repository';
import { GuestBookingsController } from './guest-bookings.controller';
import { GuestBookingsRepository } from './guest-bookings.repository';
import { BookingManagementController } from './booking-management.controller';
import { BookingManagementRepository } from './booking-management.repository';
import { BookingManagementService } from './booking-management.service';
import { BookingChangeEmailService } from './booking-change-email.service';

@Module({
  imports: [
    GuestsModule,
    RoomTypesModule,
    TypeOrmModule.forFeature([Booking, PromotionReference, Payment]),
  ],
  exports: [TypeOrmModule, BookingsService],
  controllers: [
    BookingsController,
    GuestBookingsController,
    BookingManagementController,
  ],
  providers: [
    BookingsService,
    BookingRepository,
    GuestBookingsRepository,
    BookingManagementRepository,
    BookingManagementService,
    BookingChangeEmailService,
  ],
})
export class BookingsModule {}
