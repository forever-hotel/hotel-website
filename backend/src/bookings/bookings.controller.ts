import {
  Body,
  Controller,
  Header,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}
  @Post('booking-quotes')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Create an owned price quote without reserving inventory',
  })
  quote(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Body() input: CreateBookingQuoteDto,
  ) {
    return this.bookings.createQuote(guest.sub, input);
  }

  @Post('bookings')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Reserve inventory pending payment' })
  reserve(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Body() input: CreateReservationDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.createReservation(guest.sub, input, key);
  }
}
