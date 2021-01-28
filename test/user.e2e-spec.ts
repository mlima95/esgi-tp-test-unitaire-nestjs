import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('/user (POST) birthdate is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(2010, 11, 30),
        email: 'toto@toto.fr',
        firstname: 'toto',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: 'tata',
        password: 'regsgdsgrdsgkhkjh',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
  });

  it('/user (POST) mail is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(1980, 11, 30),
        email: 'totototo.fr',
        firstname: 'toto',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: 'tata',
        password: 'regsgdsgrdsgkhkjh',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
  });

  it('/user (POST) firstname is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(1980, 11, 30),
        email: 'toto@toto.fr',
        firstname: '',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: 'tata',
        password: 'regsgdsgrdsgkhkjh',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
  });

  it('/user (POST) lastname is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(2010, 11, 30),
        email: 'toto@toto.fr',
        firstname: 'toto',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: '',
        password: 'regsgdsgrdsgkhkjh',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
  });

  it('/user (POST) password is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(2010, 11, 30),
        email: 'toto@toto.fr',
        firstname: 'toto',
        id: '9bbf437c-3308-4ece-93e3-8b1745e7760b',
        isValid: undefined,
        lastname: 'tata',
        password: 'azerty',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
  });

  it('/user (POST) id is not valid ', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .send({
        birthDate: new Date(2010, 11, 30),
        email: 'toto@toto.fr',
        firstname: 'toto',
        id: '42',
        isValid: undefined,
        lastname: 'tata',
        password: 'azerty',
        todolist: undefined,
      })
      .set('Content-type', 'application/json')
      .expect(400);
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
