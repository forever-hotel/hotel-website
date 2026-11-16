import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Guest } from '../../guests/entities/guest.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { Room } from '../../room-types/entities/room.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { BookingSource } from '../enums/booking-source.enum';
import { PromotionReference } from './promotion-reference.entity';

/** Existing infra table. No cascaded writes, schema synchronization or migrations. */
@Entity({ name: 'bookings', synchronize: false })
export class Booking {
  @PrimaryGeneratedColumn('uuid', { name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'guest_id', type: 'uuid', nullable: true })
  guestId: string | null;

  @ManyToOne(() => Guest, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guest_id' })
  guest: Relation<Guest> | null;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId: string;

  @ManyToOne(() => RoomType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: Relation<RoomType>;

  @Column({ name: 'room_number', type: 'varchar', length: 10, nullable: true })
  roomNumber: string | null;

  @ManyToOne(() => Room, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_number' })
  room: Relation<Room> | null;

  @Column({ name: 'promo_id', type: 'uuid', nullable: true })
  promoId: string | null;

  @ManyToOne(() => PromotionReference, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'promo_id' })
  promotion: Relation<PromotionReference> | null;

  // PostgreSQL DATE values stay YYYY-MM-DD strings, not timezone-shifted instants.
  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ name: 'total_amount', type: 'integer' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: BookingSource,
    enumName: 'booking_source',
    default: BookingSource.WEBSITE,
  })
  source: BookingSource;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests: string | null;

  @Column({ name: 'hold_expires_at', type: 'timestamptz', nullable: true })
  holdExpiresAt: Date | null;

  @Column({
    name: 'checkout_key',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  checkoutKey: string | null;

  @Column({
    name: 'checkout_request_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  checkoutRequestHash: string | null;

  @Column({ name: 'price_snapshot', type: 'jsonb', nullable: true })
  priceSnapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  @Column({ name: 'num_guests', type: 'integer', default: 1 })
  numGuests: number;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Relation<Payment[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
