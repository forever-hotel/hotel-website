import { ApiProperty } from '@nestjs/swagger';
import { GuestResponseDto } from './guest-response.dto';

export class GuestProfileResponseDto extends GuestResponseDto {
  @ApiProperty({ type: String, nullable: true, example: '+94771234567' })
  phone: string | null;
}
