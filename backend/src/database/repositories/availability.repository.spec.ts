import { DataSource } from 'typeorm';
import { AvailabilityRepository } from './availability.repository';

describe('AvailabilityRepository', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const repository = new AvailabilityRepository({
    transaction,
  } as unknown as DataSource);
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation(
      (
        _isolation: string,
        callback: (manager: { query: typeof query }) => unknown,
      ) => callback({ query }),
    );
  });
  it('reads capacity, rooms and active overlapping bookings in one consistent snapshot', async () => {
    query
      .mockResolvedValueOnce([{ maxGuests: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    expect(
      await repository.snapshot('type-id', '2026-12-10', '2026-12-12'),
    ).toEqual({ maxGuests: 2, rooms: [], bookings: [] });
    expect(transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(query.mock.calls[2]).toEqual([
      expect.stringContaining(
        "status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')",
      ),
      ['type-id', '2026-12-10', '2026-12-12'],
    ]);
  });
  it('returns null without reading rooms for an unknown type', async () => {
    query.mockResolvedValueOnce([]);
    expect(
      await repository.snapshot('missing', '2026-12-10', '2026-12-12'),
    ).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('propagates inventory failures', async () => {
    query.mockRejectedValueOnce(new Error('unavailable'));
    await expect(
      repository.snapshot('id', '2026-12-10', '2026-12-12'),
    ).rejects.toThrow('unavailable');
  });
});
