import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { RoomTypeAmenity } from './room-type-amenity.entity';
import { RoomTypeImage } from './room-type-image.entity';

/**
 * Maps the shared `room_types` table (SDS 2.2.4). Room types are a fixed list
 * seeded by forever-hotel/infra; the website only reads them (HW-03).
 */
@Entity({ name: 'room_types' })
export class RoomType {
  @PrimaryGeneratedColumn('uuid', { name: 'room_type_id' })
  roomTypeId: string;

  @Column({ name: 'type_name', type: 'varchar', length: 100 })
  typeName: string;

  /** Price per night in LKR cents. */
  @Column({ name: 'price_per_night', type: 'integer' })
  pricePerNight: number;

  @Column({ name: 'max_guests', type: 'integer' })
  maxGuests: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => RoomTypeImage, (image) => image.roomType)
  images: Relation<RoomTypeImage[]>;

  @OneToMany(() => RoomTypeAmenity, (amenity) => amenity.roomType)
  amenities: Relation<RoomTypeAmenity[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
