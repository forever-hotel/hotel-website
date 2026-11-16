import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PromotionRepository } from '../database/repositories/promotion.repository';

@Injectable()
export class PromotionsService {
  constructor(private readonly repository: PromotionRepository) {}

  async findActive(limit: number) {
    try {
      const promotions = await this.repository.findActive(limit);
      return {
        items: promotions.map((promotion) => ({
          ...promotion,
          validFrom: promotion.validFrom.toISOString(),
          validUntil: promotion.validUntil.toISOString(),
        })),
        nextCursor: null,
      };
    } catch {
      throw new ServiceUnavailableException({
        error: 'DEPENDENCY_UNAVAILABLE',
        message: 'Promotions are temporarily unavailable.',
      });
    }
  }
}
