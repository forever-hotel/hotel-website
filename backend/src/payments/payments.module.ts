import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { GuestsModule } from '../guests/guests.module';
import { PaymentRepository } from '../database/repositories/payment.repository';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './payments.controller';
import { StripeProvider } from './stripe-provider';
import { ConfirmationEmailRepository } from './confirmation-email.repository';
import { ConfirmationEmailService } from './confirmation-email.service';
import { PayHereProvider } from './payhere-provider';
import { PayHereRepository } from './payhere.repository';
import { PayHerePaymentsService } from './payhere-payments.service';
import {
  PayHerePaymentsController,
  PayHereNotifyController,
} from './payhere.controller';

@Module({
  imports: [BookingsModule, GuestsModule, TypeOrmModule.forFeature([Payment])],
  providers: [
    PaymentRepository,
    PaymentsService,
    StripeProvider,
    ConfirmationEmailRepository,
    ConfirmationEmailService,
    PayHereProvider,
    PayHereRepository,
    PayHerePaymentsService,
  ],
  controllers: [
    PayHerePaymentsController,
    PayHereNotifyController,
    StripeWebhookController,
  ],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
