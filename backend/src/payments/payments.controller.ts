import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  Header,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { CreateReservationDto } from '../bookings/dto/create-reservation.dto';
import type { PaymentOption } from './payment-policy';
import { PaymentsService } from './payments.service';

export class PaymentOptionDto {
  @ApiProperty({ enum: ['FULL', 'DEPOSIT'] })
  @IsIn(['FULL', 'DEPOSIT'])
  paymentOption: PaymentOption;
}
export class StartPaymentDto extends CreateReservationDto {
  @ApiProperty({ enum: ['FULL', 'DEPOSIT'] })
  @IsIn(['FULL', 'DEPOSIT'])
  paymentOption: PaymentOption;
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get('options')
  @Header('Cache-Control', 'no-store')
  options() {
    return this.payments.options();
  }
  @Get('recovery/:quoteId')
  @Header('Cache-Control', 'no-store')
  recover(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('quoteId', new ParseUUIDPipe()) id: string,
  ) {
    return this.payments.recover(guest.sub, id);
  }
  @Post('checkout')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  start(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Body() input: StartPaymentDto,
    @Headers('idempotency-key') key?: string,
  ) {
    const { paymentOption, ...reservation } = input;
    return this.payments.start(guest.sub, reservation, paymentOption, key);
  }
  @Get(':bookingId')
  @Header('Cache-Control', 'no-store')
  status(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
  ) {
    return this.payments.status(guest.sub, id);
  }
  @Post(':bookingId/resume')
  @Header('Cache-Control', 'no-store')
  resume(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
    @Body() input: PaymentOptionDto,
  ) {
    return this.payments.resume(guest.sub, id, input.paymentOption);
  }
  @Post(':bookingId/cancel')
  @Header('Cache-Control', 'no-store')
  cancel(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
  ) {
    return this.payments.cancel(guest.sub, id);
  }
}

@ApiTags('payments')
@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(private readonly payments: PaymentsService) {}
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.payments.webhook(request.rawBody, signature);
  }
}
