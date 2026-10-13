import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { RoomStatus } from '../../src/common/enums/room-status.enum';
import { RoomTypeRepository } from '../../src/database/repositories/room-type.repository';
import { RoomRepository } from '../../src/database/repositories/room.repository';
import { RoomTypeAmenity } from '../../src/room-types/entities/room-type-amenity.entity';
import { RoomTypeImage } from '../../src/room-types/entities/room-type-image.entity';
import { RoomType } from '../../src/room-types/entities/room-type.entity';
import { Room } from '../../src/room-types/entities/room.entity';

// Requires a database created from database/infra-schema/ (DB_* variables).
// Seeds one uniquely named room type and deletes only what it created.
describe('Room type and room repositories (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roomTypes: RoomTypeRepository;
  let rooms: RoomRepository;
  let roomType: RoomType;
  const roomNumbers: string[] = [];

  // Room numbers are VARCHAR(10); "T" plus 8 random hex characters fits.
  const testRoomNumber = () => `T${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    roomTypes = app.get(RoomTypeRepository);
    rooms = app.get(RoomRepository);

    roomType = await dataSource.getRepository(RoomType).save({
      typeName: `IT Suite ${randomUUID().slice(0, 8)}`,
      pricePerNight: 2_500_000,
      maxGuests: 2,
      description: 'Integration test room type',
    });
    await dataSource.getRepository(RoomTypeImage).save([
      { roomTypeId: roomType.roomTypeId, imageUrl: '/images/it/b.jpg' },
      { roomTypeId: roomType.roomTypeId, imageUrl: '/images/it/a.jpg' },
    ]);
    await dataSource.getRepository(RoomTypeAmenity).save([
      { roomTypeId: roomType.roomTypeId, amenity: 'Wi-Fi' },
      { roomTypeId: roomType.roomTypeId, amenity: 'Air conditioning' },
    ]);
    const statuses = [
      RoomStatus.VACANT,
      RoomStatus.OCCUPIED,
      RoomStatus.UNDER_MAINTENANCE,
    ];
    const seededRooms = statuses.map((status) => ({
      roomNumber: testRoomNumber(),
      roomTypeId: roomType.roomTypeId,
      floor: 1,
      status,
    }));
    roomNumbers.push(...seededRooms.map((room) => room.roomNumber));
    await dataSource.getRepository(Room).save(seededRooms);
  });

  afterAll(async () => {
    if (roomNumbers.length > 0) {
      await dataSource.getRepository(Room).delete(roomNumbers);
    }
    if (roomType) {
      // Images and amenities are removed by ON DELETE CASCADE.
      await dataSource.getRepository(RoomType).delete(roomType.roomTypeId);
    }
    await app.close();
  });

  it('should return a room type with its images and amenities given its id', async () => {
    // Act
    const found = await roomTypes.findById(roomType.roomTypeId);

    // Assert
    expect(found).toMatchObject({
      roomTypeId: roomType.roomTypeId,
      typeName: roomType.typeName,
      pricePerNight: 2_500_000,
      maxGuests: 2,
    });
    expect(found?.amenities.map((item) => item.amenity)).toEqual([
      'Air conditioning',
      'Wi-Fi',
    ]);
    expect(found?.images.map((item) => item.imageUrl).sort()).toEqual([
      '/images/it/a.jpg',
      '/images/it/b.jpg',
    ]);
  });

  it('should include the room type with its details given findAll is called', async () => {
    // Act
    const all = await roomTypes.findAll();

    // Assert
    const found = all.find((item) => item.roomTypeId === roomType.roomTypeId);
    expect(found?.images).toHaveLength(2);
    expect(found?.amenities).toHaveLength(2);
  });

  it('should return null given a room type id that does not exist', async () => {
    // Act & Assert
    await expect(roomTypes.findById(randomUUID())).resolves.toBeNull();
  });

  it('should count only rooms that are not under maintenance', async () => {
    // Act
    const count = await rooms.countBookableRooms(roomType.roomTypeId);

    // Assert
    expect(count).toBe(2);
  });

  it('should reject a room given a room type that does not exist', async () => {
    // Act
    const insert = dataSource.getRepository(Room).insert({
      roomNumber: testRoomNumber(),
      roomTypeId: randomUUID(),
      floor: 1,
    });

    // Assert
    await expect(insert).rejects.toBeInstanceOf(QueryFailedError);
  });
});
