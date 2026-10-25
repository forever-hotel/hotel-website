import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface PublicPromotion {
  promoId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  currency: 'LKR';
  validFrom: Date;
  validUntil: Date;
  roomTypeIds: string[];
}

/** Read-only interim adapter. Manager Dashboard remains the promotion owner. */
@Injectable()
export class PromotionRepository {
  constructor(private readonly source: DataSource) {}

  findActive(limit: number): Promise<PublicPromotion[]> {
    return this.source.query<PublicPromotion[]>(
      `SELECT p.promo_id AS "promoId",p.code_string AS code,
        CASE p.discount_type WHEN 'FIXED_AMOUNT' THEN 'FIXED' ELSE 'PERCENTAGE' END AS "discountType",
        p.discount_value AS "discountValue",'LKR' AS currency,
        p.valid_from AS "validFrom",p.valid_until AS "validUntil",
        ARRAY(SELECT r.room_type_id::text FROM mad_promotion_room_types r
          WHERE r.promo_id=p.promo_id ORDER BY r.room_type_id) AS "roomTypeIds"
      FROM mad_promotion_codes p
      WHERE p.status='ACTIVE' AND p.valid_from<=statement_timestamp()
        AND statement_timestamp()<p.valid_until
        AND p.current_redemptions<p.max_redemptions
        AND p.code_string ~ '^[A-Za-z0-9_-]{1,50}$'
      ORDER BY p.valid_until,p.promo_id LIMIT $1`,
      [limit],
    );
  }
}
