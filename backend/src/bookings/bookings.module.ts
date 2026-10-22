import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { PromotionReference } from './entities/promotion-reference.entity';
import { PaymentsModule } from '../payments/payments.module';
import { GuestsModule } from '../guests/guests.module';
import { RoomTypesModule } from '../room-types/room-types.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingRepository } from '../database/repositories/booking.repository';

@Module({
  imports: [
    GuestsModule,
    RoomTypesModule,
    PaymentsModule,
    TypeOrmModule.forFeature([Booking, PromotionReference]),
  ],
  exports: [TypeOrmModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingRepository],
})
export class BookingsModule {}
