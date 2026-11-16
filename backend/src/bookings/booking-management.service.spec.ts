import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { BookingRepository } from '../database/repositories/booking.repository';
import { BookingChangeEmailService } from './booking-change-email.service';
import { BookingManagementRepository } from './booking-management.repository';
import type { ManagedBooking } from './booking-management.repository';
import { BookingManagementService } from './booking-management.service';
import { PROJECT_MANAGEMENT_POLICY } from './management-policy';
import { readQuote } from './quote-token';

describe('Owned booking modification and cancellation', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const room = '22222222-2222-4222-8222-222222222222';
  const secret = 'management-fixture-signing-secret-at-least-32-chars';
  let booking: ManagedBooking;
  let now: Date;
  let values: Record<string, string>;
  const repository = {
    locked: jest.fn(),
    roomName: jest.fn(),
    save: jest.fn(),
  };
  const inventory = { rate: jest.fn(), available: jest.fn() };
  const email = { send: jest.fn() };
  let service: BookingManagementService;
  const input = () => ({
    roomTypeId: room,
    checkInDate: '2099-12-12',
    checkOutDate: '2099-12-14',
    numberOfGuests: 2,
  });
  beforeEach(() => {
    jest.resetAllMocks();
    now = new Date('2099-12-01T12:00:00Z');
    booking = {
      bookingId: id,
      guestId: 'owner',
      roomTypeId: room,
      roomNumber: '101',
      checkInDate: '2099-12-10',
      checkOutDate: '2099-12-12',
      numberOfGuests: 2,
      status: 'CONFIRMED',
      source: 'WEBSITE',
      currency: 'LKR',
      totalAmount: 2000000,
      paidAmount: 2000000,
      specialRequests: 'Quiet room',
      holdExpiresAt: null,
      priceSnapshot: {
        payment: { paymentId: 'original-payment' },
        confirmationEmail: { state: 'ACCEPTED' },
      },
    };
    values = {
      'jwt.secret': secret,
      NODE_ENV: 'test',
      BOOKING_MANAGEMENT_POLICY: JSON.stringify(PROJECT_MANAGEMENT_POLICY),
      BOOKING_PRICING_POLICY: JSON.stringify({
        version: 'test',
        rateBasis: 'INCLUSIVE',
        charges: [],
      }),
    };
    repository.locked.mockImplementation(
      (
        _id: string,
        guest: string,
        _target: string | undefined,
        work: (
          manager: object,
          value: ManagedBooking,
          time: Date,
        ) => Promise<unknown>,
      ) => {
        if (guest !== booking.guestId)
          throw new NotFoundException('Booking not found.');
        return work({}, booking, now);
      },
    );
    repository.roomName.mockResolvedValue('Test Suite');
    repository.save.mockResolvedValue(undefined);
    inventory.rate.mockResolvedValue({ nightlyRate: 1000000, maxGuests: 2 });
    inventory.available.mockResolvedValue(1);
    email.send.mockResolvedValue('SANDBOX');
    service = new BookingManagementService(
      repository as unknown as BookingManagementRepository,
      inventory as unknown as BookingRepository,
      { get: (key: string) => values[key] } as ConfigService,
      email as unknown as BookingChangeEmailService,
    );
  });
  it('previews a change without writes and uses a separate signing domain', async () => {
    const result = await service.quote('owner', id, input());
    expect(result).toMatchObject({
      totalAmount: 2000000,
      balanceAmount: 0,
      revision: 0,
      specialRequests: 'Quiet room',
    });
    expect(inventory.available).toHaveBeenCalledWith({}, input(), id);
    expect(readQuote(result.quoteToken, secret, 'owner')).toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });
  it('honours frozen pricing, releases stale room assignments and preserves payment/email metadata', async () => {
    const quote = await service.quote('owner', id, {
      ...input(),
      specialRequests: '',
    });
    inventory.rate.mockResolvedValue({ nightlyRate: 1100000, maxGuests: 2 });
    const result = await service.modify(
      'owner',
      id,
      quote.quoteToken,
      'change-key-1',
    );
    expect(result).toMatchObject({
      status: 'CONFIRMED',
      totalAmount: 2000000,
      revision: 1,
      replayed: false,
      specialRequests: null,
      operation: { kind: 'MODIFIED', emailStatus: 'SANDBOX' },
    });
    expect(booking.roomNumber).toBeNull();
    expect(booking.priceSnapshot.payment).toEqual({
      paymentId: 'original-payment',
    });
    expect(booking.priceSnapshot.confirmationEmail).toEqual({
      state: 'ACCEPTED',
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledWith(id, result.operation.id);
  });
  it('reports staff-reviewed balances and refunds for repriced stays', async () => {
    const higher = await service.quote('owner', id, {
      ...input(),
      checkOutDate: '2099-12-15',
    });
    expect(higher.balanceAmount).toBe(1000000);
    const result = await service.modify(
      'owner',
      id,
      higher.quoteToken,
      'change-key-2',
    );
    expect(result.balanceAmount).toBe(1000000);
    expect((await service.options('owner', id)).eligible).toBe(false);
  });
  it('cancels once with a full pending refund, without marking payments refunded', async () => {
    const result = await service.cancel('owner', id, 0, 'cancel-key-1');
    expect(result).toMatchObject({
      status: 'CANCELLED',
      refundAmount: 2000000,
      refundStatus: 'PENDING',
      balanceAmount: 0,
      revision: 1,
    });
    now = new Date('2100-01-01');
    delete values.BOOKING_MANAGEMENT_POLICY;
    const replay = await service.cancel('owner', id, 0, 'cancel-key-1');
    expect(replay.replayed).toBe(true);
    expect(replay.operation.id).toBe(result.operation.id);
    expect(repository.save).toHaveBeenCalledTimes(1);
    await expect(
      service.cancel('owner', id, 0, 'different-key'),
    ).rejects.toThrow();
  });
  it('replays successful modifications even after quote expiry; mismatched key reuse conflicts', async () => {
    const quote = await service.quote('owner', id, input());
    const result = await service.modify(
      'owner',
      id,
      quote.quoteToken,
      'change-key-3',
    );
    now = new Date('2100-01-01');
    const replay = await service.modify(
      'owner',
      id,
      quote.quoteToken,
      'change-key-3',
    );
    expect(replay.operation.id).toBe(result.operation.id);
    expect(repository.save).toHaveBeenCalledTimes(1);
    await expect(
      service.cancel('owner', id, 1, 'change-key-3'),
    ).rejects.toThrow();
  });
  it.each(['PENDING', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'])(
    'rejects ineligible status %s',
    async (status) => {
      booking.status = status;
      await expect(
        service.cancel('owner', id, 0, 'cancel-key-2'),
      ).rejects.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('rejects late requests at the exact hotel cutoff and new dates inside the cutoff', async () => {
    now = new Date('2099-12-09T08:30:00Z');
    await expect(
      service.cancel('owner', id, 0, 'cancel-key-3'),
    ).rejects.toThrow();
    now = new Date('2099-12-08T08:30:00Z');
    await expect(
      service.quote('owner', id, { ...input(), checkInDate: '2099-12-09' }),
    ).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects stale revision, foreign ownership and tampered quote without writes', async () => {
    await expect(
      service.cancel('owner', id, 1, 'cancel-key-4'),
    ).rejects.toThrow();
    await expect(
      service.cancel('other', id, 0, 'cancel-key-4'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.modify('owner', id, 'invalid.token', 'change-key-4'),
    ).rejects.toThrow();
    const quote = await service.quote('owner', id, input());
    await expect(
      service.modify('other', id, quote.quoteToken, 'change-key-4'),
    ).rejects.toThrow();
    booking.totalAmount++;
    await expect(
      service.modify('owner', id, quote.quoteToken, 'change-key-4'),
    ).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects unavailable inventory at preview or commit and capacity changes', async () => {
    inventory.available.mockResolvedValue(0);
    await expect(service.quote('owner', id, input())).rejects.toThrow();
    inventory.available.mockResolvedValue(1);
    const quote = await service.quote('owner', id, input());
    inventory.available.mockResolvedValue(0);
    await expect(
      service.modify('owner', id, quote.quoteToken, 'change-key-5'),
    ).rejects.toThrow();
    inventory.rate.mockResolvedValue({ nightlyRate: 1000000, maxGuests: 1 });
    await expect(
      service.modify('owner', id, quote.quoteToken, 'change-key-5'),
    ).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('supports restrictive pricing and requires production policy configuration', async () => {
    values.BOOKING_MANAGEMENT_POLICY = JSON.stringify({
      ...PROJECT_MANAGEMENT_POLICY,
      modificationSettlement: 'SAME_TOTAL_ONLY',
    });
    await expect(
      service.quote('owner', id, { ...input(), checkOutDate: '2099-12-15' }),
    ).rejects.toThrow();
    values.NODE_ENV = 'production';
    delete values.BOOKING_MANAGEMENT_POLICY;
    expect((await service.options('owner', id)).eligible).toBe(false);
    await expect(
      service.cancel('owner', id, 0, 'cancel-key-5'),
    ).rejects.toThrow();
    values.NODE_ENV = 'development';
    expect((await service.options('owner', id)).eligible).toBe(true);
  });
  it('requires request keys and does not send mail after a failed commit', async () => {
    await expect(service.cancel('owner', id, 0, undefined)).rejects.toThrow();
    repository.save.mockRejectedValue(new Error('private database error'));
    await expect(
      service.cancel('owner', id, 0, 'cancel-key-6'),
    ).rejects.toThrow('Booking management is unavailable');
    expect(email.send).not.toHaveBeenCalled();
  });
});
