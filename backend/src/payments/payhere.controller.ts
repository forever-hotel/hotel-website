import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { PaymentOptionDto } from './payments.controller';
import { PayHereStartDto } from './payhere.dto';
import { PayHerePaymentsService } from './payhere-payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PayHerePaymentsController {
  constructor(private readonly payments: PayHerePaymentsService) {}
  @Get('options')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'PayHere availability and sandbox mode' })
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
  @ApiOperation({ summary: 'Create owned PayHere checkout POST fields' })
  start(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Body() input: PayHereStartDto,
    @Headers('idempotency-key') key?: string,
  ) {
    const { paymentOption, billing, ...reservation } = input;
    return this.payments.start(
      guest.sub,
      reservation,
      paymentOption,
      billing,
      key,
    );
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
@Controller('payments/payhere')
export class PayHereNotifyController {
  constructor(private readonly payments: PayHerePaymentsService) {}
  @Post('notify')
  @HttpCode(200)
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({
    summary:
      'Verify PayHere signed callback and corroborate with Retrieval API',
  })
  notify(@Body() body: unknown) {
    return this.payments.notify(body);
  }
}
