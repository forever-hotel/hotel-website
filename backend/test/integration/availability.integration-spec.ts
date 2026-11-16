import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { AppModule } from '../../src/app.module';
import { AvailabilityRepository } from '../../src/database/repositories/availability.repository';
import { AvailabilityService } from '../../src/availability/availability.service';

// PostgreSQL integration uses connection-local temporary copies of the infra
// tables. Real inventory is never inserted, modified or deleted.
describe('Availability SQL (PostgreSQL integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const id = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    await app.init();
    dataSource = app.get(DataSource);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('respects maintenance, active statuses, unassigned inventory and checkout boundaries', async () => {
    const repository = new AvailabilityRepository({
      transaction: (
        isolation: IsolationLevel,
        read: (manager: EntityManager) => Promise<unknown>,
      ) =>
        dataSource.transaction(isolation, async (manager) => {
          for (const table of ['room_types', 'rooms', 'bookings']) {
            // Identifiers are fixed test constants, never request input.
            await manager.query(
              `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS) ON COMMIT DROP`,
            );
          }
          await manager.query(
            `INSERT INTO pg_temp.room_types (room_type_id, type_name, price_per_night, max_guests) VALUES ($1, 'Availability test', 10000, 2)`,
            [id],
          );
          await manager.query(
            `INSERT INTO pg_temp.rooms (room_number, room_type_id, floor, status) VALUES ('101', $1, 1, 'VACANT'), ('102', $1, 1, 'VACANT'), ('103', $1, 1, 'UNDER_MAINTENANCE')`,
            [id],
          );
          for (const [room, from, to, status] of [
            ['101', '2026-12-10', '2026-12-11', 'CONFIRMED'],
            [null, '2026-12-11', '2026-12-12', 'PENDING'],
            ['102', '2026-12-09', '2026-12-10', 'CHECKED_IN'],
            ['102', '2026-12-10', '2026-12-12', 'CANCELLED'],
            ['102', '2026-12-10', '2026-12-12', 'CHECKED_OUT'],
          ]) {
            await manager.query(
              `INSERT INTO pg_temp.bookings (room_type_id, room_number, check_in_date, check_out_date, status, total_amount) VALUES ($1, $2, $3, $4, $5, 10000)`,
              [id, room, from, to, status],
            );
          }
          return read(manager);
        }),
    } as unknown as DataSource);
    const service = new AvailabilityService(repository);
    const stay = await service.check({
      roomTypeId: id,
      checkInDate: '2026-12-10',
      checkOutDate: '2026-12-12',
      numberOfGuests: 2,
    });
    expect(stay.availableCount).toBe(0);
    const calendar = await service.calendar(id, '2026-12-10', '2026-12-12');
    expect(calendar.days).toEqual([
      { date: '2026-12-10', availableCount: 1, status: 'AVAILABLE' },
      { date: '2026-12-11', availableCount: 1, status: 'AVAILABLE' },
    ]);
  });
});
