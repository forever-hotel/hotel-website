import { Entity, PrimaryColumn } from 'typeorm';

/** Foreign-key reference only. MAD owns promotion data and lifecycle. */
@Entity({ name: 'mad_promotion_codes', synchronize: false })
export class PromotionReference {
  @PrimaryColumn({ name: 'promo_id', type: 'uuid' })
  promoId: string;
}
