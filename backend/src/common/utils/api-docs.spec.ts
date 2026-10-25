import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GuestsController } from '../../guests/guests.controller';
import { GuestsService } from '../../guests/guests.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RoomTypesController } from '../../room-types/room-types.controller';
import { RoomTypesService } from '../../room-types/room-types.service';
import { buildApiDocument } from './api-docs';
import { ContactController } from '../../contact/contact.controller';
import { ContactService } from '../../contact/contact.service';

describe('buildApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GuestsController, RoomTypesController, ContactController],
      providers: [
        { provide: GuestsService, useValue: {} },
        { provide: RoomTypesService, useValue: {} },
        { provide: ContactService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
  });

  afterAll(async () => {
    await app?.close();
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

  it('should document guest login and the bearer-protected profile endpoint', () => {
    // Act
    const document = buildApiDocument(app, 'hotel-website');

    // Assert
    expect(document.paths['/guests/login']?.post?.responses).toHaveProperty(
      '200',
    );
    expect(document.paths['/guests/me']?.get?.security).toEqual([
      { bearer: [] },
    ]);
  });

  it('should document the public catalogue and detail errors (HW-03)', () => {
    const document = buildApiDocument(app, 'hotel-website');
    expect(document.paths['/room-types']?.get?.responses).toHaveProperty('200');
    const detail = document.paths['/room-types/{roomTypeId}']?.get;
    expect(Object.keys(detail?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '400', '404']),
    );
    expect(detail?.security).toBeUndefined();
    const schemas = document.components?.schemas ?? {};
    expect(schemas).toHaveProperty('RoomTypeResponseDto');
    expect(schemas).toHaveProperty('RoomTypeListResponseDto');
  });

  it('documents contact acceptance, validation, throttling and outage responses', () => {
    const document = buildApiDocument(app, 'hotel-website');
    expect(
      Object.keys(document.paths['/contact/enquiries']?.post?.responses ?? {}),
    ).toEqual(expect.arrayContaining(['202', '400', '429', '503']));
  });

  it('should never document a password in the guest response', () => {
    // Act
    const document = buildApiDocument(app, 'hotel-website');

    // Assert
    const schemas = document.components?.schemas ?? {};
    expect(JSON.stringify(schemas.GuestResponseDto)).not.toMatch(/password/i);
  });
});
