import { Repository } from 'typeorm';
import { LoggerSpies, spyOnLogger } from '../../../test/unit/logger.spy';
import {
  createQueryBuilderMock,
  QueryBuilderMock,
} from '../../../test/unit/query-builder.mock';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { Room } from '../../room-types/entities/room.entity';
import { RoomRepository } from './room.repository';

describe('RoomRepository', () => {
  let queryBuilder: QueryBuilderMock;
  let repository: RoomRepository;
  let logs: LoggerSpies;

  beforeEach(() => {
    logs = spyOnLogger();
    queryBuilder = createQueryBuilderMock();
    repository = new RoomRepository({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Room>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should count rooms of the type that are not under maintenance', async () => {
    // Arrange
    queryBuilder.getCount.mockResolvedValue(4);

    // Act
    const count = await repository.countBookableRooms('room-type-1');

    // Assert
    expect(count).toBe(4);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'room.roomTypeId = :roomTypeId',
      { roomTypeId: 'room-type-1' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'room.status <> :maintenance',
      { maintenance: RoomStatus.UNDER_MAINTENANCE },
    );
    expect(logs.debug).toHaveBeenCalledWith(
      'Room type room-type-1 has 4 bookable rooms',
    );
  });

  it('should log the error name and rethrow given the query fails', async () => {
    // Arrange
    const failure = new Error('broken');
    queryBuilder.getCount.mockRejectedValue(failure);

    // Act
    const result = repository.countBookableRooms('room-type-1');

    // Assert
    await expect(result).rejects.toBe(failure);
    expect(logs.error).toHaveBeenCalledWith(
      'Counting rooms for room type room-type-1 failed: Error',
    );
  });
});
