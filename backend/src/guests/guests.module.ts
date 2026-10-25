import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtTokenService } from '../common/utils/jwt-token.service';
import { GuestRepository } from '../database/repositories/guest.repository';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { PasswordHasher } from './password-hasher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestsController],
  providers: [
    GuestRepository,
    GuestsService,
    PasswordHasher,
    JwtTokenService,
    JwtAuthGuard,
  ],
  exports: [GuestRepository, PasswordHasher, JwtTokenService],
})
export class GuestsModule {}
