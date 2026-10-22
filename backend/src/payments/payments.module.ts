import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { GuestsModule } from '../guests/guests.module';
import { PaymentRepository } from '../database/repositories/payment.repository';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  StripeWebhookController,
} from './payments.controller';
import { StripeProvider } from './stripe-provider';

@Module({
  imports: [BookingsModule, GuestsModule, TypeOrmModule.forFeature([Payment])],
  providers: [PaymentRepository, PaymentsService, StripeProvider],
  controllers: [PaymentsController, StripeWebhookController],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
