import {
  Controller,
  Get,
  Header,
  HttpException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { GuestBookingsRepository } from './guest-bookings.repository';
import type { BookingCategory } from './guest-bookings.repository';

export class GuestBookingsQuery {
  @ApiPropertyOptional({
    enum: ['upcoming', 'past', 'cancelled'],
    default: 'upcoming',
  })
  @IsIn(['upcoming', 'past', 'cancelled'])
  category: BookingCategory = 'upcoming';

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
}

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class GuestBookingsController {
  constructor(private readonly bookings: GuestBookingsRepository) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'List the signed-in guest’s bookings with category counts',
  })
  list(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Query() query: GuestBookingsQuery,
  ) {
    return this.read(() =>
      this.bookings.list(guest.sub, query.category, query.page),
    );
  }

  @Get(':bookingId')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Read an owned booking; missing and unowned IDs both return 404',
  })
  detail(
    @CurrentGuest() guest: AuthenticatedGuest,
    @Param('bookingId', new ParseUUIDPipe()) id: string,
  ) {
    return this.read(async () => {
      const booking = await this.bookings.detail(guest.sub, id);
      if (!booking) throw new NotFoundException('Booking not found.');
      return booking;
    });
  }

  private async read<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Bookings are unavailable. Please try again later.',
      );
    }
  }
}
