import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { createValidationPipe } from './validation.pipe';

class GuestCountDto {
  @IsInt()
  @Min(1)
  adults!: number;
}

class SampleBookingDto {
  @IsEmail()
  email!: string;

  @MinLength(2)
  fullName!: string;

  @ValidateNested()
  @Type(() => GuestCountDto)
  guests!: GuestCountDto;
}

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: SampleBookingDto,
};

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();

  const rejectionOf = async (payload: unknown): Promise<unknown> => {
    try {
      await pipe.transform(payload, bodyMetadata);
    } catch (error) {
      return error;
    }
    throw new Error('Expected validation to fail');
  };

  it('should return a DTO instance given a valid payload', async () => {
    // Arrange
    const payload = {
      email: 'guest@example.com',
      fullName: 'Nimal Perera',
      guests: { adults: 2 },
    };

    // Act
    const result: unknown = await pipe.transform(payload, bodyMetadata);

    // Assert
    expect(result).toBeInstanceOf(SampleBookingDto);
    expect(result).toEqual(payload);
  });

  it('should reject with VALIDATION_FAILED and every message given invalid fields', async () => {
    // Arrange
    const payload = {
      email: 'not-an-email',
      fullName: 'A',
      guests: { adults: 1 },
    };

    // Act
    const error = await rejectionOf(payload);

    // Assert
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      error: 'VALIDATION_FAILED',
      message: [
        'email must be an email',
        'fullName must be longer than or equal to 2 characters',
      ],
    });
  });

  it('should prefix nested field errors with their path', async () => {
    // Arrange
    const payload = {
      email: 'guest@example.com',
      fullName: 'Nimal Perera',
      guests: { adults: 0 },
    };

    // Act
    const error = await rejectionOf(payload);

    // Assert
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: ['guests.adults: adults must not be less than 1'],
    });
  });

  it('should reject unknown properties instead of silently accepting them', async () => {
    // Arrange
    const payload = {
      email: 'guest@example.com',
      fullName: 'Nimal Perera',
      guests: { adults: 2 },
      isAdmin: true,
    };

    // Act
    const error = await rejectionOf(payload);

    // Assert
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: ['property isAdmin should not exist'],
    });
  });
});
