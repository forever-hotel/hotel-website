import { ApiProperty } from '@nestjs/swagger';
import { RoomTypeResponseDto } from './room-type-response.dto';

export class RoomTypeListResponseDto {
  @ApiProperty({ type: [RoomTypeResponseDto] })
  items: RoomTypeResponseDto[];

  @ApiProperty({ type: String, nullable: true, example: null })
  nextCursor: null;
}
