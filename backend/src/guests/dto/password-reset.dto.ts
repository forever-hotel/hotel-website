import { PickType } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { RegisterGuestDto } from './register-guest.dto';

export class ForgotPasswordDto extends PickType(RegisterGuestDto, [
  'email',
] as const) {}

export class ResetPasswordDto extends PickType(RegisterGuestDto, [
  'password',
] as const) {
  @IsString()
  @Matches(/^[0-9a-f-]{36}\.[0-9]{13}\.[A-Za-z0-9_-]{43}$/)
  token: string;
}
