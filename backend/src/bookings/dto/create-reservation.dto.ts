import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'Signed quoteToken from booking-quotes',
    maxLength: 16000,
  })
  @IsString()
  @MaxLength(16000)
  @Matches(/^[\w-]+\.[\w-]+$/)
  quoteToken: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  // Intentionally reject non-printing control characters in plain-text requests.
  // eslint-disable-next-line no-control-regex
  @Matches(/^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f]*$/u)
  specialRequests?: string;
}
