import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestRepository } from '../database/repositories/guest.repository';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { PasswordHasher } from './password-hasher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestsController],
  providers: [GuestRepository, GuestsService, PasswordHasher],
  exports: [GuestRepository, PasswordHasher],
})
export class GuestsModule {}
