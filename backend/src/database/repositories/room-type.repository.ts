import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { errorName } from '../../common/utils/error-name';
import { RoomType } from '../../room-types/entities/room-type.entity';

/** Read-only access to the room type catalogue, with images and amenities (HW-03). */
@Injectable()
export class RoomTypeRepository {
  private readonly logger = new Logger(RoomTypeRepository.name);

  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  /** Returns every room type, cheapest first. */
  async findAll(): Promise<RoomType[]> {
    this.logger.verbose('Loading all room types with images and amenities');
    try {
      const roomTypes = await this.withDetails()
        .orderBy('roomType.pricePerNight', 'ASC')
        .addOrderBy('roomType.typeName', 'ASC')
        .addOrderBy('image.createdAt', 'ASC')
        .addOrderBy('image.imageUrl', 'ASC')
        .addOrderBy('amenity.amenity', 'ASC')
        .getMany();
      this.logger.debug(`Loaded ${roomTypes.length} room types`);
      return roomTypes;
    } catch (error) {
      this.logger.error(`Loading room types failed: ${errorName(error)}`);
      throw error;
    }
  }

  /** Returns one room type, or null. Callers must pass a valid UUID. */
  async findById(roomTypeId: string): Promise<RoomType | null> {
    this.logger.verbose(`Loading room type ${roomTypeId}`);
    try {
      const roomType = await this.withDetails()
        .where('roomType.roomTypeId = :roomTypeId', { roomTypeId })
        .orderBy('image.createdAt', 'ASC')
        .addOrderBy('image.imageUrl', 'ASC')
        .addOrderBy('amenity.amenity', 'ASC')
        .getOne();
      this.logger.debug(
        roomType
          ? `Room type found: ${roomTypeId}`
          : `Room type not found: ${roomTypeId}`,
      );
      return roomType;
    } catch (error) {
      this.logger.error(
        `Loading room type ${roomTypeId} failed: ${errorName(error)}`,
      );
      throw error;
    }
  }

  private withDetails(): SelectQueryBuilder<RoomType> {
    return this.roomTypes
      .createQueryBuilder('roomType')
      .leftJoinAndSelect('roomType.images', 'image')
      .leftJoinAndSelect('roomType.amenities', 'amenity');
  }
}
