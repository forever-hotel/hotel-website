import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../../test/unit/query-builder.mock';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { Room } from '../../room-types/entities/room.entity';
import { RoomRepository } from './room.repository';

describe('RoomRepository', () => {
  it('should count rooms of the type that are not under maintenance given countBookableRooms is called', async () => {
    // Arrange
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getCount.mockResolvedValue(4);
    const repository = new RoomRepository({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Room>);

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
  });
});
