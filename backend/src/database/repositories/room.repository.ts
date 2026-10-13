import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { Room } from '../../room-types/entities/room.entity';

/** Read-only access to the shared `rooms` table. */
@Injectable()
export class RoomRepository {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  /**
   * Counts rooms of a type that can take bookings: every room except those
   * Under Maintenance (BR 6.1.4, FD-13). Overlapping bookings are subtracted
   * by the availability check, not here.
   */
  countBookableRooms(roomTypeId: string): Promise<number> {
    return this.rooms
      .createQueryBuilder('room')
      .where('room.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('room.status <> :maintenance', {
        maintenance: RoomStatus.UNDER_MAINTENANCE,
      })
      .getCount();
  }
}
