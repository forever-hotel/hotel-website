import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';

/**
 * Maps the shared `rooms` table (SRS 13.1.5). Front Desk owns room status; the
 * website reads rooms to work out availability (HW-05, HW-09, FD-13).
 */
@Entity({ name: 'rooms' })
export class Room {
  @PrimaryColumn({ name: 'room_number', type: 'varchar', length: 10 })
  roomNumber: string;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId: string;

  @Column({ type: 'integer' })
  floor: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    enumName: 'room_status',
    default: RoomStatus.VACANT,
  })
  status: RoomStatus;

  @Column({ name: 'last_cleared_at', type: 'timestamptz', nullable: true })
  lastClearedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
