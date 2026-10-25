import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';
import { StayDatesDto } from '../../availability/dto/availability-query.dto';

/** Prices and guest identity are server-owned; unknown fields are rejected. */
export class CreateBookingQuoteDto extends StayDatesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  numberOfGuests: number;
}
