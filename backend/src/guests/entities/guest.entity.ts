import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Maps the shared `guests` table (SRS 13.1.2). The table is created by
 * forever-hotel/infra migrations; the website creates guest accounts (HW-06).
 */
@Entity({ name: 'guests' })
export class Guest {
  @PrimaryGeneratedColumn('uuid', { name: 'guest_id' })
  guestId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  // Stored trimmed and lowercase (see normalizeEmail); UNIQUE in the database.
  @Column({ type: 'varchar', length: 320 })
  email: string;

  // Never loaded unless a query asks for it, so it cannot leak into responses or logs.
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash?: string;

  @Column({
    name: 'nic_or_passport',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  nicOrPassport: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
