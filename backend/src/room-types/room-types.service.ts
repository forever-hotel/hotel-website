import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomTypeRepository } from '../database/repositories/room-type.repository';
import { RoomTypeListResponseDto } from './dto/room-type-list-response.dto';
import { RoomTypeResponseDto } from './dto/room-type-response.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly roomTypeRepository: RoomTypeRepository) {}

  async findAll(): Promise<RoomTypeListResponseDto> {
    const roomTypes = await this.roomTypeRepository.findAll();
    return {
      items: roomTypes.map((roomType) =>
        RoomTypeResponseDto.fromRoomType(roomType),
      ),
      nextCursor: null,
    };
  }

  async findById(roomTypeId: string): Promise<RoomTypeResponseDto> {
    const roomType = await this.roomTypeRepository.findById(roomTypeId);
    if (!roomType) {
      throw new NotFoundException({
        error: 'ROOM_TYPE_NOT_FOUND',
        message: 'The requested room type does not exist.',
      });
    }
    return RoomTypeResponseDto.fromRoomType(roomType);
  }
}
