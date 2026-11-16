import { Module } from '@nestjs/common';
import { PromotionRepository } from '../database/repositories/promotion.repository';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [PromotionsController],
  providers: [PromotionRepository, PromotionsService],
})
export class PromotionsModule {}
