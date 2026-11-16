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
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { BookingManagementService } from './booking-management.service';
import {
  ApplyBookingChangeDto,
  BookingChangeQuoteDto,
  CancelBookingDto,
} from './dto/booking-management.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId')
export class BookingManagementController {
  constructor(private readonly bookings: BookingManagementService) {}
  @Get('management')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Read owned booking management eligibility, revision and financial state',
  })
  options(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
  ) {
    return this.bookings.options(guest.sub, id);
  }
  @Post('change-quote')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Preview an owned booking change without reserving inventory or changing the booking',
  })
  quote(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
    @Body() input: BookingChangeQuoteDto,
  ) {
    return this.bookings.quote(guest.sub, id, input);
  }
  @Post('changes')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  modify(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
    @Body() input: ApplyBookingChangeDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.modify(guest.sub, id, input.quoteToken, key);
  }
  @Post('cancellations')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  cancel(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
    @Body() input: CancelBookingDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.cancel(guest.sub, id, input.revision, key);
  }
}
