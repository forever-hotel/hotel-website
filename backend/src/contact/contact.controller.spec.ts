import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { createValidationPipe } from '../common/pipes/validation.pipe';
import { ContactModule } from './contact.module';
import { ContactService } from './contact.service';

const valid = {
  name: 'Nimali Perera',
  email: 'nimali@example.test',
  subject: 'General enquiry',
  message: 'Please tell me about your room options.',
};

describe('ContactController (HTTP)', () => {
  let app: INestApplication<App>;
  const service = { send: jest.fn() };
  beforeEach(async () => {
    service.send.mockReset().mockResolvedValue({ status: 'accepted' });
    const module = await Test.createTestingModule({ imports: [ContactModule] })
      .overrideProvider(ContactService)
      .useValue(service)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('accepts a public enquiry and trims safe fields', async () => {
    const result = await request(app.getHttpServer())
      .post('/contact/enquiries')
      .send({ ...valid, name: '  Nimali Perera  ' });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ status: 'accepted' });
    expect(service.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nimali Perera' }),
    );
  });
  it.each([
    { ...valid, email: 'bad' },
    { ...valid, name: ' ' },
    { ...valid, name: 'X\r\nInjected' },
    { ...valid, message: 'short' },
    { ...valid, message: 'a'.repeat(3001) },
    { ...valid, subject: 'Invalid' },
    { ...valid, phone: 'bad' },
    { ...valid, unexpected: 'field' },
  ])('rejects invalid input before dispatch', async (body) => {
    const result = await request(app.getHttpServer())
      .post('/contact/enquiries')
      .send(body);
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: 'VALIDATION_FAILED' });
    expect(service.send).not.toHaveBeenCalled();
  });
  it('rate limits repeated submissions', async () => {
    for (let n = 0; n < 5; n++)
      await request(app.getHttpServer())
        .post('/contact/enquiries')
        .send(valid)
        .expect(202);
    const result = await request(app.getHttpServer())
      .post('/contact/enquiries')
      .send(valid);
    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({ error: 'RATE_LIMITED' });
    expect(service.send).toHaveBeenCalledTimes(5);
  });
});
