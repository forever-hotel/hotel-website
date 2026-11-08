import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsUUID,
  Min,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { StayDatesDto } from '../../availability/dto/availability-query.dto';

/** Prices and guest identity are server-owned; unknown fields are rejected. */
export class CreateBookingQuoteDto extends StayDatesDto {
  @ApiPropertyOptional({
    description: 'One promotion code; trimmed and uppercased.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]{1,50}$/)
  promoCode?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  numberOfGuests: number;
}
