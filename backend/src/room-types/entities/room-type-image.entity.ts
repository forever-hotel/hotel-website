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

/** Maps the shared `room_type_images` table: one row per image of a room type. */
@Entity({ name: 'room_type_images' })
export class RoomTypeImage {
  @PrimaryColumn({ name: 'room_type_id', type: 'uuid' })
  roomTypeId: string;

  @PrimaryColumn({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @ManyToOne(() => RoomType, (roomType) => roomType.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_type_id' })
  roomType: Relation<RoomType>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
