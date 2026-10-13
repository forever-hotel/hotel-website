import { Repository } from 'typeorm';
import { LoggerSpies, spyOnLogger } from '../../../test/unit/logger.spy';
import {
  createQueryBuilderMock,
  QueryBuilderMock,
} from '../../../test/unit/query-builder.mock';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { RoomTypeRepository } from './room-type.repository';

describe('RoomTypeRepository', () => {
  let queryBuilder: QueryBuilderMock;
  let createQueryBuilder: jest.Mock;
  let repository: RoomTypeRepository;
  let logs: LoggerSpies;

  beforeEach(() => {
    logs = spyOnLogger();
    queryBuilder = createQueryBuilderMock();
    createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    repository = new RoomTypeRepository({
      createQueryBuilder,
    } as unknown as Repository<RoomType>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should load images and amenities, cheapest first', async () => {
      // Arrange
      const roomTypes = [{ roomTypeId: 'deluxe' }] as RoomType[];
      queryBuilder.getMany.mockResolvedValue(roomTypes);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toBe(roomTypes);
      expect(createQueryBuilder).toHaveBeenCalledWith('roomType');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'roomType.images',
        'image',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'roomType.amenities',
        'amenity',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'roomType.pricePerNight',
        'ASC',
      );
      expect(logs.debug).toHaveBeenCalledWith('Loaded 1 room types');
    });

    it('should log the error name and rethrow given the query fails', async () => {
      // Arrange
      const failure = new Error('broken');
      queryBuilder.getMany.mockRejectedValue(failure);

      // Act
      const result = repository.findAll();

      // Assert
      await expect(result).rejects.toBe(failure);
      expect(logs.error).toHaveBeenCalledWith(
        'Loading room types failed: Error',
      );
    });
  });

  describe('findById', () => {
    it('should filter by id with a bound parameter', async () => {
      // Arrange
      queryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById('room-type-1');

      // Assert
      expect(result).toBeNull();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'roomType.roomTypeId = :roomTypeId',
        { roomTypeId: 'room-type-1' },
      );
      expect(logs.debug).toHaveBeenCalledWith(
        'Room type not found: room-type-1',
      );
    });

    it('should log a debug message given the room type exists', async () => {
      // Arrange
      queryBuilder.getOne.mockResolvedValue({ roomTypeId: 'room-type-1' });

      // Act
      await repository.findById('room-type-1');

      // Assert
      expect(logs.debug).toHaveBeenCalledWith('Room type found: room-type-1');
    });

    it('should log the error name and rethrow given the query fails', async () => {
      // Arrange
      const failure = new Error('broken');
      queryBuilder.getOne.mockRejectedValue(failure);

      // Act
      const result = repository.findById('room-type-1');

      // Assert
      await expect(result).rejects.toBe(failure);
      expect(logs.error).toHaveBeenCalledWith(
        'Loading room type room-type-1 failed: Error',
      );
    });
  });
});
