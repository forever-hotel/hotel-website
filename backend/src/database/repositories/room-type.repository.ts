import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RoomType } from '../../room-types/entities/room-type.entity';

/** Read-only access to the room type catalogue, with images and amenities (HW-03). */
@Injectable()
export class RoomTypeRepository {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  /** Returns every room type, cheapest first. */
  findAll(): Promise<RoomType[]> {
    return this.withDetails()
      .orderBy('roomType.pricePerNight', 'ASC')
      .addOrderBy('roomType.typeName', 'ASC')
      .addOrderBy('image.createdAt', 'ASC')
      .addOrderBy('image.imageUrl', 'ASC')
      .addOrderBy('amenity.amenity', 'ASC')
      .getMany();
  }

  /** Returns one room type, or null. Callers must pass a valid UUID. */
  findById(roomTypeId: string): Promise<RoomType | null> {
    return this.withDetails()
      .where('roomType.roomTypeId = :roomTypeId', { roomTypeId })
      .orderBy('image.createdAt', 'ASC')
      .addOrderBy('image.imageUrl', 'ASC')
      .addOrderBy('amenity.amenity', 'ASC')
      .getOne();
  }

  private withDetails(): SelectQueryBuilder<RoomType> {
    return this.roomTypes
      .createQueryBuilder('roomType')
      .leftJoinAndSelect('roomType.images', 'image')
      .leftJoinAndSelect('roomType.amenities', 'amenity');
  }
}
