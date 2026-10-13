import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestRepository } from '../database/repositories/guest.repository';
import { Guest } from './entities/guest.entity';

// Registration (HW-06) adds its controller and service here.
@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  providers: [GuestRepository],
  exports: [GuestRepository],
})
export class GuestsModule {}
