import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { RoomType } from './room-type.entity';

/** Maps the shared `room_type_amenities` table: one row per amenity of a room type. */
@Entity({ name: 'room_type_amenities' })
export class RoomTypeAmenity {
  @PrimaryColumn({ name: 'room_type_id', type: 'uuid' })
  roomTypeId: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  amenity: string;

  @ManyToOne(() => RoomType, (roomType) => roomType.amenities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_type_id' })
  roomType: Relation<RoomType>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
