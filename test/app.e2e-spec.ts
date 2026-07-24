import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import * as supertest from 'supertest';
import { AppModule } from './../src/app.module';

const request = supertest as unknown as (
  app: Server,
) => supertest.SuperTest<supertest.Test>;

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns the wrapped success envelope', () => {
    return request(app.getHttpServer() as Server)
      .get('/')
      .expect(200)
      .expect({ success: true, data: 'Hello World!' });
  });
});
