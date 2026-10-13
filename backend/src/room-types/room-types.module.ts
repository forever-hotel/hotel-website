import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomTypeRepository } from '../database/repositories/room-type.repository';
import { RoomRepository } from '../database/repositories/room.repository';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity';
import { RoomTypeImage } from './entities/room-type-image.entity';
import { RoomType } from './entities/room-type.entity';
import { Room } from './entities/room.entity';

// The room catalogue API (HW-03, HW-04) adds its controller and service here.
@Module({
  imports: [
    TypeOrmModule.forFeature([RoomType, RoomTypeImage, RoomTypeAmenity, Room]),
  ],
  providers: [RoomTypeRepository, RoomRepository],
  exports: [RoomTypeRepository, RoomRepository],
})
export class RoomTypesModule {}
