import { Repository } from 'typeorm';
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

  beforeEach(() => {
    queryBuilder = createQueryBuilderMock();
    createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    repository = new RoomTypeRepository({
      createQueryBuilder,
    } as unknown as Repository<RoomType>);
  });

  it('should load images and amenities, cheapest first, given findAll is called', async () => {
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
  });

  it('should filter by id with a bound parameter given findById is called', async () => {
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
  });
});
