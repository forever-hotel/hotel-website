import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GuestsController } from '../../guests/guests.controller';
import { GuestsService } from '../../guests/guests.service';
import { buildApiDocument } from './api-docs';

describe('buildApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [{ provide: GuestsService, useValue: {} }],
    }).compile();
    app = moduleRef.createNestApplication();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should document the registration endpoint with its success and error responses', () => {
    // Act
    const document = buildApiDocument(app, 'hotel-website');

    // Assert
    expect(document.info.title).toBe('hotel-website API');
    const register = document.paths['/guests/register']?.post;
    expect(Object.keys(register?.responses ?? {})).toEqual(
      expect.arrayContaining(['201', '400', '409']),
    );
  });

  it('should never document a password in the guest response', () => {
    // Act
    const document = buildApiDocument(app, 'hotel-website');

    // Assert
    const schemas = document.components?.schemas ?? {};
    expect(JSON.stringify(schemas.GuestResponseDto)).not.toMatch(/password/i);
  });
});
