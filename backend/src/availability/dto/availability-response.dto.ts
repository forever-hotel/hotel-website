import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' })
  roomTypeId: string;

  @ApiProperty({ format: 'date' })
  checkInDate: string;

  @ApiProperty({ format: 'date' })
  checkOutDate: string;

  @ApiProperty({ minimum: 1 })
  numberOfGuests: number;

  @ApiProperty({ minimum: 0 })
  availableCount: number;

  @ApiProperty({ format: 'date-time' })
  checkedAt: string;
}

export class AvailabilityDayDto {
  @ApiProperty({ format: 'date' })
  date: string;

  @ApiProperty({ minimum: 0 })
  availableCount: number;

  @ApiProperty({ enum: ['AVAILABLE', 'BLOCKED'] })
  status: string;
}

export class AvailabilityCalendarResponseDto {
  @ApiProperty({ format: 'uuid' })
  roomTypeId: string;

  @ApiProperty({ type: [AvailabilityDayDto] })
  days: AvailabilityDayDto[];

  @ApiProperty({ format: 'date-time' })
  checkedAt: string;
}
