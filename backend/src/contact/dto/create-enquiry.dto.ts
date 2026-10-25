import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateEnquiryDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[^\r\n]+$/)
  name: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[+\d ()-]{7,25}$/)
  phone?: string;

  @ApiProperty({
    enum: ['General enquiry', 'Rooms and stays', 'Events', 'Other'],
  })
  @IsIn(['General enquiry', 'Rooms and stays', 'Events', 'Other'])
  subject: string;

  @ApiProperty({ minLength: 10, maxLength: 3000 })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message: string;
}
