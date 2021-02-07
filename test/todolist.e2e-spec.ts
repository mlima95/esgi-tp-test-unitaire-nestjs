import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection, Repository } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { Todolist } from '../src/todolist/entities/todolist.entity';
import { Constants } from '../src/shared/constants';

describe('TodoListController (e2e)', () => {
  let app: INestApplication;
  let todoList: Todolist;
  let user: User;
  let connection;
  let userRepo: Repository<User>;
  let todolistRepo: Repository<Todolist>;

  const ID_USER = '9bbf437c-3308-4ece-93e3-8b1745e7670c';
  const ID_TODOLIST = '8aaf437c-3308-4ece-93e3-8b1745e7670a';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userRepo = moduleFixture.get('UserRepository');
    todolistRepo = moduleFixture.get('TodolistRepository');
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    connection = app.get(Connection);
    await connection.synchronize(true);
    await setUp();
  });

  afterEach(async () => {
    await destroyAll();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setUp() {
    await createValidUserAndTodolist();
  }

  it('/todolist (POST) - cas todolist non unique', async () => {
    const todoList2 = {
      id: getUUID(),
      name: 'todoNotUnique',
      user: user,
    };
    // Test Api
    const response = await genericPostRequest(todoList2);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  /**
   * Enclenche une requête générique pour POST sur l'API
   * @param todolist
   */
  async function genericPostRequest(todolist) {
    return request(app.getHttpServer())
      .post(`/todolist`)
      .send(todolist)
      .set('Content-type', 'application/json');
  }

  async function createValidUserAndTodolist() {
    user = await userRepo.save({
      id: ID_USER,
      firstname: 'Bruce',
      lastname: 'Wayne',
      email: 'not@batman.ahum',
      password: '12345678910',
      birthDate: new Date(1978, 4, 17).toISOString(),
      isValid: true,
    });

    todoList = await todolistRepo.save({
      id: ID_TODOLIST,
      name: 'testTodo',
      user: user,
    });
  }

  function getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  async function destroyAll() {
    await deleteUser();
    await deleteAllTodolist();
  }

  async function getAllTodolist() {
    return await todolistRepo.find();
  }

  async function deleteAllTodolist() {
    const todolists = await getAllTodolist();
    for (const todolist of todolists) {
      await todolistRepo.delete(todolist.id);
    }
  }

  async function deleteUser() {
    await userRepo.delete(ID_USER);
  }
});
