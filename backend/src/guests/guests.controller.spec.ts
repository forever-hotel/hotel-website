import { Guest } from './entities/guest.entity';
import { GuestAuthResponseDto } from './dto/guest-auth-response.dto';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

describe('GuestsController', () => {
  it('should return only the public guest fields given a successful registration', async () => {
    // Arrange
    const createdAt = new Date('2026-10-14T08:00:00Z');
    const guest = Object.assign(new Guest(), {
      guestId: 'guest-1',
      fullName: 'Nimali Perera',
      email: 'nimali@example.com',
      phone: '+94771234567',
      nicOrPassport: null,
      createdAt,
      updatedAt: createdAt,
    });
    const register = jest.fn().mockResolvedValue(guest);
    const controller = new GuestsController({
      register,
    } as unknown as GuestsService);
    const dto = {
      fullName: 'Nimali Perera',
      email: 'nimali@example.com',
      password: 'a long passphrase',
    };

    // Act
    const response = await controller.register(dto);

    // Assert
    expect(register).toHaveBeenCalledWith(dto);
    expect(response).toEqual({
      guestId: 'guest-1',
      fullName: 'Nimali Perera',
      email: 'nimali@example.com',
      createdAt: '2026-10-14T08:00:00.000Z',
    });
  });

  it('should return a token response given successful login', async () => {
    // Arrange
    const response = Object.assign(new GuestAuthResponseDto(), {
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      guest: {
        guestId: '5dce7d08-2686-4afb-a663-f3c21a7b6632',
        fullName: 'Nimali Perera',
        email: 'nimali@example.com',
        createdAt: '2026-10-14T08:00:00.000Z',
      },
    });
    const login = jest.fn().mockResolvedValue(response);
    const controller = new GuestsController({
      login,
    } as unknown as GuestsService);
    const dto = {
      email: 'nimali@example.com',
      password: 'a long passphrase',
    };

    // Act
    const result = await controller.login(dto);

    // Assert
    expect(login).toHaveBeenCalledWith(dto);
    expect(result).toBe(response);
  });
});
