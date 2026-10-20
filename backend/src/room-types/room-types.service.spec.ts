import { RoomTypeRepository } from '../database/repositories/room-type.repository';
import { RoomType } from './entities/room-type.entity';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesService', () => {
  let repository: jest.Mocked<Pick<RoomTypeRepository, 'findAll' | 'findById'>>;
  let service: RoomTypesService;

  const roomType = Object.assign(new RoomType(), {
    roomTypeId: '11111111-1111-4111-8111-111111111111',
    typeName: 'Deluxe Double',
    description: 'A double room for two guests.',
    pricePerNight: 250000,
    maxGuests: 2,
    images: [{ imageUrl: '/images/deluxe.webp' }],
    amenities: [{ amenity: 'Wi-Fi' }],
    createdAt: new Date(),
  });

  const publicDetails = {
    roomTypeId: roomType.roomTypeId,
    typeName: 'Deluxe Double',
    description: 'A double room for two guests.',
    pricePerNight: 250000,
    currency: 'LKR',
    maxGuests: 2,
    imageUrls: ['/images/deluxe.webp'],
    amenities: ['Wi-Fi'],
  };

  beforeEach(() => {
    repository = { findAll: jest.fn(), findById: jest.fn() };
    service = new RoomTypesService(repository as unknown as RoomTypeRepository);
  });

  it('should return public catalogue fields given room types exist', async () => {
    repository.findAll.mockResolvedValue([roomType]);

    const catalogue = await service.findAll();

    expect(catalogue).toEqual({ items: [publicDetails], nextCursor: null });
  });

  it('should return an empty list given no room types exist', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('should return public details given a known room type id', async () => {
    repository.findById.mockResolvedValue(roomType);

    await expect(service.findById(roomType.roomTypeId)).resolves.toEqual(
      publicDetails,
    );
    expect(repository.findById).toHaveBeenCalledWith(roomType.roomTypeId);
  });

  it('should preserve empty details given a room type has no images, amenities or description', async () => {
    repository.findById.mockResolvedValue(
      Object.assign(new RoomType(), roomType, {
        description: null,
        images: [],
        amenities: [],
      }),
    );

    await expect(service.findById(roomType.roomTypeId)).resolves.toEqual({
      ...publicDetails,
      description: null,
      imageUrls: [],
      amenities: [],
    });
  });

  it('should return 404 given an unknown room type id', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById(roomType.roomTypeId)).rejects.toMatchObject({
      status: 404,
      response: {
        error: 'ROOM_TYPE_NOT_FOUND',
        message: 'The requested room type does not exist.',
      },
    });
  });

  it('should propagate database failures instead of reporting an empty catalogue', async () => {
    const failure = new Error('Database unavailable');
    repository.findAll.mockRejectedValue(failure);
    repository.findById.mockRejectedValue(failure);

    await expect(service.findAll()).rejects.toBe(failure);
    await expect(service.findById(roomType.roomTypeId)).rejects.toBe(failure);
  });
});
