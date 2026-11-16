import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsString, MaxLength } from 'class-validator';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_BYTES } from '../../config/constants';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class LoginGuestDto {
  @ApiProperty({ example: 'nimali@example.com', maxLength: EMAIL_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MaxLength(EMAIL_MAX_LENGTH)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'your password', maxLength: PASSWORD_MAX_BYTES })
  @IsString()
  @IsByteLength(0, PASSWORD_MAX_BYTES)
  password: string;
}
