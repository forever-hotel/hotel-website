import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsUUID, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StayDatesDto {
  @ApiProperty({ example: '2026-12-10' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  checkInDate: string;

  @ApiProperty({ example: '2026-12-12' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  checkOutDate: string;
}

export class AvailabilityQueryDto extends StayDatesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfGuests: number;
}

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-12-10' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({ example: '2026-12-12' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  to: string;
}
