import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AvailabilityRepository,
  InventorySnapshot,
} from '../database/repositories/availability.repository';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

const DAY = 86_400_000;

@Injectable()
export class AvailabilityService {
  constructor(private readonly inventory: AvailabilityRepository) {}

  async check(query: AvailabilityQueryDto) {
    this.validateRange(query.checkInDate, query.checkOutDate);
    const snapshot = await this.load(
      query.roomTypeId,
      query.checkInDate,
      query.checkOutDate,
    );
    if (query.numberOfGuests > snapshot.maxGuests) {
      throw new BadRequestException({
        error: 'CAPACITY_EXCEEDED',
        message: 'The guest count exceeds the capacity of this room type.',
      });
    }
    return {
      ...query,
      availableCount: this.count(
        snapshot,
        query.checkInDate,
        query.checkOutDate,
      ),
      checkedAt: new Date().toISOString(),
    };
  }

  async calendar(roomTypeId: string, from: string, to: string) {
    this.validateRange(from, to);
    const snapshot = await this.load(roomTypeId, from, to);
    const days: { date: string; availableCount: number; status: string }[] = [];
    for (let time = Date.parse(from); time < Date.parse(to); time += DAY) {
      const date = new Date(time).toISOString().slice(0, 10);
      const next = new Date(time + DAY).toISOString().slice(0, 10);
      const availableCount = this.count(snapshot, date, next);
      days.push({
        date,
        availableCount,
        status: availableCount > 0 ? 'AVAILABLE' : 'BLOCKED',
      });
    }
    return { roomTypeId, days, checkedAt: new Date().toISOString() };
  }

  private validateRange(from: string, to: string) {
    const nights = (Date.parse(to) - Date.parse(from)) / DAY;
    if (!Number.isInteger(nights) || nights < 1 || nights > 90) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Checkout must follow check-in by 1 to 90 nights.',
      });
    }
  }

  private async load(roomTypeId: string, from: string, to: string) {
    let snapshot: InventorySnapshot | null;
    try {
      snapshot = await this.inventory.snapshot(roomTypeId, from, to);
    } catch {
      throw new ServiceUnavailableException({
        error: 'INVENTORY_UNAVAILABLE',
        message: 'Room availability cannot be checked right now.',
      });
    }
    if (!snapshot) {
      throw new NotFoundException({
        error: 'ROOM_TYPE_NOT_FOUND',
        message: 'The requested room type does not exist.',
      });
    }
    return snapshot;
  }

  private count(snapshot: InventorySnapshot, from: string, to: string) {
    const overlapping = snapshot.bookings.filter(
      (booking) => booking.checkInDate < to && booking.checkOutDate > from,
    );
    const assigned = new Set(overlapping.map((booking) => booking.roomNumber));
    const freeRooms = snapshot.rooms.filter(
      (room) =>
        ['VACANT', 'OCCUPIED', 'REQUIRES_CLEANING'].includes(room.status) &&
        !assigned.has(room.roomNumber),
    ).length;
    // A full stay must fit one room throughout. Reserve capacity for every
    // overlapping unassigned booking, even when their nights do not coincide.
    const unassigned = overlapping.filter((b) => b.roomNumber === null).length;
    return Math.max(0, freeRooms - unassigned);
  }
}
