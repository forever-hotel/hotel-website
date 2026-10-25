import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateBookingQuoteDto } from './create-booking-quote.dto';

export class BookingChangeQuoteDto extends CreateBookingQuoteDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  // eslint-disable-next-line no-control-regex
  @Matches(/^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f]*$/u)
  specialRequests?: string;
}

export class ApplyBookingChangeDto {
  @ApiProperty({
    description: 'Signed token from this booking’s change quote',
    maxLength: 16000,
  })
  @IsString()
  @MaxLength(16000)
  @Matches(/^[\w-]+\.[\w-]+$/)
  quoteToken: string;
}

export class CancelBookingDto {
  @ApiProperty({
    description: 'Current management revision from GET bookings/:id/management',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  revision: number;
}
