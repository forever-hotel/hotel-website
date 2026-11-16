import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

/** Provider references only; no raw card fields. Mapped to the infra-owned table. */
@Entity({ name: 'payments', synchronize: false })
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'integer' })
  amount: number;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'stripe_ref', type: 'varchar', length: 255, nullable: true })
  stripeRef: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
