import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CreateItemDto } from '../src/item/dto/create-item.dto';
import { Todolist } from '../src/todolist/entities/todolist.entity';
import { TodolistModule } from '../src/todolist/todolist.module';
import { UserModule } from '../src/user/user.module';
import { ItemModule } from '../src/item/item.module';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../src/user/entities/user.entity';
import { Connection, Repository } from 'typeorm';
import { Item } from '../src/item/entities/item.entity';
import { constants } from 'http2';

let app: INestApplication;
let todoList: Todolist;
let user: User;
let connection;
let userRepo: Repository<User>;
let itemRepo: Repository<Item>;
let todolistRepo: Repository<Todolist>;
const ID_USER = '9bbf437c-3308-4ece-93e3-8b1745e7760b';
const ID_TODOLIST = '8aaf437c-3308-4ece-93e3-8b1745e7760a';

jest.setTimeout(30000);

describe('ItemController (e2e)', () => {
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'root',
          password: 'root',
          database: 'todolist',
          migrationsRun: true,
          autoLoadEntities: true,
          synchronize: true,
          keepConnectionAlive: true,
        }),
        UserModule,
        ItemModule,
        TodolistModule,
      ],
      providers: [
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Todolist),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Item),
          useClass: Repository,
        },
      ],
    }).compile();

    userRepo = moduleFixture.get('UserRepository');
    itemRepo = moduleFixture.get('ItemRepository');
    todolistRepo = moduleFixture.get('TodolistRepository');

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    connection = app.get(Connection);
    await connection.synchronize(true);
    await app.init();
    await setUp();
  });

  afterEach(async () => {
    await destroyAll();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/item/:id (GET) - cas nominal de get', async () => {
    // Créer l'item à get
    const id = getUUID();
    await createItem(null, id);
    const response = await request(app.getHttpServer())
      .get(`/item/${id}`)
      .send();
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.id).toEqual(id);
  });

  it('/item (POST) - cas nominal de création', async () => {
    const item = getModelValidItem();
    const response = await request(app.getHttpServer())
      .post(`/item`)
      .send(item)
      .set('Content-type', 'application/json');
    console.log('wmwmwm', response.body);
    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body.id).toEqual(item.id);
  });

  // it('/item (POST) - cas création récente', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (POST) - cas + de items', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (POST) - cas déclenchement du mail au bout de 8 items', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (POST) - cas name non unique', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (POST) - cas content superieur à 1000', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas plus rien ne va plus', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas nominal de création', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas création récente', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas + de items', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas déclenchement du mail au bout de 8 items', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas name non unique', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas content superieur à 1000', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (PUT) - cas plus rien ne va plus', async () => {
  //   expect(true).toBeTruthy();
  // });
  //
  // it('/item (DELETE) - cas nominal de suppression', async () => {
  //   expect(true).toBeTruthy();
  // });
});

async function setUp(nbrItem = 0) {
  await createValidUserAndTodolist();
  await factoryRandomValidItem(nbrItem);
}

async function destroyAll() {
  await deleteAllItem();
  await deleteUserAndTodolist();
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

async function getAllItem(ID_TODOLIST: string) {
  return await itemRepo.find({ where: { todolist: ID_TODOLIST } });
}

async function deleteUserAndTodolist() {
  await userRepo.delete(ID_USER);
  await todolistRepo.delete(ID_TODOLIST);
}

async function createItem(item?: CreateItemDto, uuid?: string) {
  if (!!item) {
    await itemRepo.save(item);
    return;
  }

  await itemRepo.save(getModelValidItem(uuid));
}

function getModelValidItem(uuid?: string) {
  return {
    id: !!uuid ? uuid : getUUID(),
    name: new Array(+5).join('abc'),
    content: new Array(+10).join('xyz'),
    createdDate: new Date().toISOString(),
    todolist: todoList,
  };
}

async function factoryRandomValidItem(nbrItem: number) {
  for (let ind = 0; ind < nbrItem; ind++) {
    await createItem();
  }
}

async function deleteAllItem() {
  const items = await getAllItem(ID_TODOLIST);
  for (const item of items) {
    await itemRepo.delete(item.id);
  }
}

function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
