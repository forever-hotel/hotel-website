import { DataSource } from 'typeorm';
import { Booking } from './booking.entity';
import { PromotionReference } from './promotion-reference.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { RoomTypeImage } from '../../room-types/entities/room-type-image.entity';
import { RoomTypeAmenity } from '../../room-types/entities/room-type-amenity.entity';
import { Room } from '../../room-types/entities/room.entity';

class MetadataSource extends DataSource {
  build() {
    return this.buildMetadatas();
  }
}

describe('Booking/payment mapping safety (no database connection)', () => {
  const source = new MetadataSource({
    type: 'postgres',
    entities: [
      Booking,
      Payment,
      PromotionReference,
      Guest,
      RoomType,
      RoomTypeImage,
      RoomTypeAmenity,
      Room,
    ],
    synchronize: false,
  });
  beforeAll(async () => {
    await source.build();
  });

  it('builds valid cross-entity relationships without enabling schema writes or cascade writes', () => {
    for (const entity of [Booking, Payment, PromotionReference]) {
      const metadata = source.getMetadata(entity);
      expect(metadata.synchronize).toBe(false);
      for (const relation of metadata.relations) {
        expect(relation.isCascadeInsert).toBe(false);
        expect(relation.isCascadeUpdate).toBe(false);
        expect(relation.isCascadeRemove).toBe(false);
        expect(relation.isEager).toBe(false);
      }
    }
    const booking = source.getMetadata(Booking);
    expect(
      booking.relations.find((relation) => relation.propertyName === 'payments')
        ?.inverseEntityMetadata.target,
    ).toBe(Payment);
    expect(source.getMetadata(Payment).relations[0].onDelete).toBe('RESTRICT');
  });

  it('preserves date-only stay values, integer money and nullable infra assignments', () => {
    const booking = source.getMetadata(Booking);
    for (const property of ['checkInDate', 'checkOutDate'])
      expect(booking.findColumnWithPropertyName(property)?.type).toBe('date');
    for (const property of ['guestId', 'roomNumber', 'promoId'])
      expect(booking.findColumnWithPropertyName(property)?.isNullable).toBe(
        true,
      );
    expect(booking.findColumnWithPropertyName('totalAmount')?.type).toBe(
      'integer',
    );
    expect(
      source.getMetadata(Payment).findColumnWithPropertyName('amount')?.type,
    ).toBe('integer');
  });

  it('maps the exact shared enum identities and never introduces raw card storage', () => {
    const booking = source.getMetadata(Booking);
    expect(booking.findColumnWithPropertyName('status')?.enum).toEqual([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
    ]);
    expect(booking.findColumnWithPropertyName('source')?.enumName).toBe(
      'booking_source',
    );
    const payment = source.getMetadata(Payment);
    expect(payment.findColumnWithPropertyName('paymentStatus')?.enum).toEqual([
      'PENDING',
      'COMPLETED',
      'REFUNDED',
      'FAILED',
    ]);
    expect(payment.findColumnWithPropertyName('paymentMethod')?.enum).toEqual([
      'STRIPE',
      'CASH',
      'CARD_ON_SITE',
    ]);
    expect(payment.columns.map((column) => column.databaseName).sort()).toEqual(
      [
        'payment_id',
        'booking_id',
        'payment_method',
        'amount',
        'payment_status',
        'stripe_ref',
        'paid_at',
        'created_at',
        'updated_at',
      ].sort(),
    );
  });
});
