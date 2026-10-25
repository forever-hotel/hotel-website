import { ApiProperty } from '@nestjs/swagger';
import { Guest } from '../entities/guest.entity';

/** Public view of a guest account. Never includes the password or its hash. */
export class GuestResponseDto {
  @ApiProperty({ format: 'uuid' })
  guestId: string;

  @ApiProperty({ example: 'Nimali Perera' })
  fullName: string;

  @ApiProperty({ example: 'nimali@example.com' })
  email: string;

  @ApiProperty({ format: 'date-time', example: '2026-10-14T08:00:00.000Z' })
  createdAt: string;

  static fromGuest(guest: Guest): GuestResponseDto {
    return Object.assign(new GuestResponseDto(), {
      guestId: guest.guestId,
      fullName: guest.fullName,
      email: guest.email,
      createdAt: guest.createdAt.toISOString(),
    });
  }
}
