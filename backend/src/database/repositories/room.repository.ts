import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { errorName } from '../../common/utils/error-name';
import { Room } from '../../room-types/entities/room.entity';

/** Read-only access to the shared `rooms` table. */
@Injectable()
export class RoomRepository {
  private readonly logger = new Logger(RoomRepository.name);

  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  /**
   * Counts rooms of a type that can take bookings: every room except those
   * Under Maintenance (BR 6.1.4, FD-13). Overlapping bookings are subtracted
   * by the availability check, not here.
   */
  async countBookableRooms(roomTypeId: string): Promise<number> {
    this.logger.verbose(`Counting bookable rooms for room type ${roomTypeId}`);
    try {
      const count = await this.rooms
        .createQueryBuilder('room')
        .where('room.roomTypeId = :roomTypeId', { roomTypeId })
        .andWhere('room.status <> :maintenance', {
          maintenance: RoomStatus.UNDER_MAINTENANCE,
        })
        .getCount();
      this.logger.debug(`Room type ${roomTypeId} has ${count} bookable rooms`);
      return count;
    } catch (error) {
      this.logger.error(
        `Counting rooms for room type ${roomTypeId} failed: ${errorName(error)}`,
      );
      throw error;
    }
  }
}
