import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsEmail } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';

import { configureApp } from '../src/configure-app.js';

class SampleDto {
  @IsEmail()
  email!: string;
}

@Controller('sample')
class SampleController {
  @Post()
  create(@Body() dto: SampleDto) {
    return dto;
  }
}

@Module({ controllers: [SampleController] })
class SampleModule {}

describe('ValidationPipe (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SampleModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 for invalid body', () => {
    return request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('accepts valid body', () => {
    return request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ email: 'user@example.com' })
      .expect(201)
      .expect({ email: 'user@example.com' });
  });
});
