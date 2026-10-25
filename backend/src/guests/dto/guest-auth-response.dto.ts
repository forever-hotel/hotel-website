import { ApiProperty } from '@nestjs/swagger';
import { GuestResponseDto } from './guest-response.dto';

export class GuestAuthResponseDto {
  @ApiProperty({ description: 'Signed guest access token' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ example: 86400 })
  expiresIn: number;

  @ApiProperty({ type: GuestResponseDto })
  guest: GuestResponseDto;
}
