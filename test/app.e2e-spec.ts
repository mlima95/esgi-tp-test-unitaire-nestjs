import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('/user (POST) is valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(1980, 11, 30),
        email: 'toto@toto.fr',
        firstname: 'toto',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: 'tata',
        password: 'regsgdsgrdsgkhkjh',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(201);
  });
});
