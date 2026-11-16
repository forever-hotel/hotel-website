import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NAME_PATTERN,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  PHONE_PATTERN,
} from '../../config/constants';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Body of POST /guests/register (HW-06). Rules follow SDS Table 14. */
export class RegisterGuestDto {
  @ApiProperty({ example: 'Nimali Perera', maxLength: GUEST_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MaxLength(GUEST_NAME_MAX_LENGTH)
  @Matches(GUEST_NAME_PATTERN, {
    message:
      'fullName may contain only letters, spaces, hyphens and apostrophes',
  })
  fullName: string;

  @ApiProperty({ example: 'nimali@example.com', maxLength: EMAIL_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MaxLength(EMAIL_MAX_LENGTH)
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'a long passphrase',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_BYTES,
    description: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_BYTES} characters`,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @IsByteLength(0, PASSWORD_MAX_BYTES, {
    message: `password must be at most ${PASSWORD_MAX_BYTES} bytes long`,
  })
  password: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must be 10 to 15 digits, optionally starting with +',
  })
  phone?: string;
}
