import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RoomTypeParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomTypeId: string;
}
