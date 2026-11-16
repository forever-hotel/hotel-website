import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRateLimitGuard } from './contact-rate-limit.guard';

@Module({
  imports: [ConfigModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRateLimitGuard],
})
export class ContactModule {}
