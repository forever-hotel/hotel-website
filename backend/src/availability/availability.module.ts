import { Module } from '@nestjs/common';
import { AvailabilityRepository } from '../database/repositories/availability.repository';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityRepository, AvailabilityService],
})
export class AvailabilityModule {}
