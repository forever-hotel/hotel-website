import { ApiProperty } from '@nestjs/swagger';
import { RoomType } from '../entities/room-type.entity';

/** Public room details. Prices are integer LKR cents, not rupees. */
export class RoomTypeResponseDto {
  @ApiProperty({ format: 'uuid' })
  roomTypeId: string;

  @ApiProperty({ example: 'Deluxe Double' })
  typeName: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ example: 250000, description: 'Price per night in LKR cents' })
  pricePerNight: number;

  @ApiProperty({ example: 'LKR', enum: ['LKR'] })
  currency: 'LKR';

  @ApiProperty({ example: 2 })
  maxGuests: number;

  @ApiProperty({ type: [String], example: ['/images/deluxe-double.webp'] })
  imageUrls: string[];

  @ApiProperty({ type: [String], example: ['Wi-Fi', 'Air conditioning'] })
  amenities: string[];

  static fromRoomType(roomType: RoomType): RoomTypeResponseDto {
    return Object.assign(new RoomTypeResponseDto(), {
      roomTypeId: roomType.roomTypeId,
      typeName: roomType.typeName,
      description: roomType.description,
      pricePerNight: roomType.pricePerNight,
      currency: 'LKR' as const,
      maxGuests: roomType.maxGuests,
      imageUrls: roomType.images.map((image) => image.imageUrl),
      amenities: roomType.amenities.map((item) => item.amenity),
    });
  }
}
