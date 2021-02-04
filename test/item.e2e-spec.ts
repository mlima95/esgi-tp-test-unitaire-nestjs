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
import { Constants } from '../src/shared/constants';
import { MailerService } from '../src/shared/services/mailer/mailer.service';

// Dépendances à initialiser
let app: INestApplication;
let mailerServiceFake: MailerService;
let todoList: Todolist;
let user: User;
let connection;
let userRepo: Repository<User>;
let itemRepo: Repository<Item>;
let todolistRepo: Repository<Todolist>;

// Pour ne pas gêner les autres données, donner des ID prédéfinis
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
        MailerService,
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
    mailerServiceFake = moduleFixture.get('MailerService');

    // Création de l'application
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    connection = app.get(Connection);
    await connection.synchronize(true);
    await app.init();

    // Remplissage de la BDD de valeur de test
    await setUp();
  });

  afterEach(async () => {
    await destroyAll();
  });

  afterAll(async () => {
    await app.close();
  });

  /******************************************************************
   *                           GET REQUEST                          *
   * ****************************************************************/

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

  it("/item/:id (GET) - cas pas d'item trouvé", async () => {
    // Créer l'item à get
    const response = await request(app.getHttpServer())
      .get(`/item/abcd`)
      .send();
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(Constants.ERROR_MSG_ITEM_NOT_FOUND);
  });

  /******************************************************************
   *                           POST REQUEST                         *
   * ****************************************************************/

  it('/item (POST) - cas nominal de création', async () => {
    const item = getModelValidItem();

    // Test API
    const response = await genericPostRequest(item);

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body.id).toEqual(item.id);
  });

  it('/item (POST) - création sans user', async () => {
    const item = getModelValidItem();

    item.todolist.user = undefined;

    // Test API
    const response = await genericPostRequest(item);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(Constants.ERROR_MSG_USER_NOT_FOUND);
  });

  it('/item (POST) - cas creation récente', async () => {
    // Création d'un item (avec un name unique et une date initialiser à maintenant)
    const item1 = getModelValidItem();
    item1.name = 'Item1';
    await itemRepo.save(item1);

    // Création d'un item (avec un name unique et une date initialiser à maintenant)
    const itemToTest = getModelValidItem();

    // Test Api
    const response = await genericPostRequest(itemToTest);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(
      // Le message change la date soumise, donc on check juste le début
      Constants.ERROR_MSG_LIMIT_BETWEEN_ITEM_CREATION.substring(0, 10),
    );
  });

  it('/item (POST) - cas trop de items', async () => {
    // Mise en place des items
    await factoryRandomValidItem(Constants.MAX_ITEM_LENGTH);

    // Création d'un item detest
    const itemToTest = getModelValidItem();

    // Test APi
    const response = await genericPostRequest(itemToTest);
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(
      Constants.ERROR_MSG_LIMIT_ITEM_EXCEED,
    );
  });

  it("/item (POST) - cas déclenchement du mail si assez d'item", async () => {
    // Mise en place des items, avec la règle pour les mails -1
    await factoryRandomValidItem(Constants.ITEM_NUMBER_TO_SEND_MAIL - 1, true);

    // Création du dernier item
    const itemToTest = getModelValidItem();

    //Mock de la fonction d'envoi de mail pour simulation d'envoi
    const sendMailMocked = jest
      .spyOn(mailerServiceFake, 'sendMail')
      .mockImplementationOnce(() => true);

    // Test Api
    const response = await genericPostRequest(itemToTest);

    // Test sur le nombre de fois que la méthode a été appelé
    expect(sendMailMocked.mock.calls.length).toBeGreaterThan(0);
  });

  it('/item (POST) - cas name non unique', async () => {
    // Création de deux items avec le même nom
    const commonName = 'Court Of Owl';
    const item1 = getModelValidItem();
    const item2 = getModelValidItem();
    item1.name = commonName;
    item2.name = commonName;

    // Enregistrement de l'item 1 directement en base
    await itemRepo.save(item1);

    // Appel de l'API pour l'item2
    const response = await genericPostRequest(item2);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(
      Constants.ERROR_MSG_ITEM_NAME_NOT_UNIQUE,
    );
  });

  it('/item (POST) - cas content superieur à 1000', async () => {
    // Récupération d'item et changement de son content pour violer la règle
    const itemToTest = getModelValidItem();
    itemToTest.content = new Array(+Constants.MAX_CONTENT_LENGTH_STR).join(
      'xyz',
    );

    // Test Api
    const response = await genericPostRequest(itemToTest);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(Constants.ERROR_MSG_LENGTH_CONTENT);
  });

  /******************************************************************
   *                           PUT REQUEST                          *
   * ****************************************************************/

  it('/item/:id (PUT) - cas nominal update', async () => {
    const id = getUUID();
    const item = getModelValidItem(id);

    await itemRepo.save(item);

    const newName = 'Gotham';
    item.name = newName;

    // Test API
    const response = await genericPutRequest(item, id);
    expect(response.status).toBe(HttpStatus.OK);
  });

  it('/item/:id (PUT) - cas update item non existant', async () => {
    const item = getModelValidItem();

    // Test Api
    const response = await genericPutRequest(item, 'alfred');

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(Constants.ERROR_MSG_ITEM_NOT_FOUND);
  });

  it('/item/:id (PUT) - cas name non unique', async () => {
    const id = getUUID();
    // Création de deux items avec le même nom
    const commonName = 'Double Face';
    const item1 = getModelValidItem();
    const item2 = getModelValidItem(id);
    item1.name = commonName;

    // Enregistrement de l'item 1 directement en base
    await itemRepo.save(item1);
    await itemRepo.save(item2);

    // Mise à jour fautive
    item2.name = commonName;

    // Appel de l'API pour l'item2
    const response = await genericPutRequest(item2, id);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(
      Constants.ERROR_MSG_ITEM_NAME_NOT_UNIQUE,
    );
  });

  it('/item/:id (PUT) - cas content superieur à 1000', async () => {
    const id = getUUID();
    // Récupération d'item et changement de son content pour violer la règle
    const itemToTest = getModelValidItem(id);

    // Save
    await itemRepo.save(itemToTest);

    // Modif fautive
    itemToTest.content = new Array(+Constants.MAX_CONTENT_LENGTH_STR).join(
      'xyz',
    );

    // Test Api
    const response = await genericPutRequest(itemToTest, id);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(Constants.ERROR_MSG_LENGTH_CONTENT);
  });

  /******************************************************************
   *                           DELETE REQUEST                       *
   * ****************************************************************/
  it('/item (DELETE) - cas nominal de suppression', async () => {
    // Créer l'item à Delete
    const id = getUUID();
    await createItem(null, id);

    // Test API
    const response = await request(app.getHttpServer()).delete(`/item/${id}`);
    expect(response.status).toBe(HttpStatus.OK);
  });

  it('/item (DELETE) - cas nominal item non trouvable', async () => {
    // Test API
    const response = await request(app.getHttpServer()).delete(`/item/aaaa`);
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    expect(response.body.message).toContain(Constants.ERROR_MSG_ITEM_NOT_FOUND);
  });
});

/**
 * Enclenche une requête générique pour POST sur l'API
 * @param item
 */
async function genericPostRequest(item) {
  return request(app.getHttpServer())
    .post(`/item`)
    .send(item)
    .set('Content-type', 'application/json');
}

/**
 * Enclenche une requête générique pour PUT sur l'API
 * @param item
 * @param id
 */
async function genericPutRequest(item, id) {
  return request(app.getHttpServer())
    .put(`/item/${id}`)
    .send(item)
    .set('Content-type', 'application/json');
}

/**
 * Met en place l'user et la todolist au démarrage
 * Peut aussi créer X Item grâce au num en param
 * @param nbrItem
 */
async function setUp(nbrItem?: number) {
  await createValidUserAndTodolist();
  await factoryRandomValidItem(nbrItem);
}

/**
 * Nettoie la BDD
 */
async function destroyAll() {
  await deleteAllItem();
  await deleteUserAndTodolist();
}

/**
 * Créer un utilisateur et une todolist valid dans la BDD
 */
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

/**
 * Prend tous les items d'une todolist
 * @param ID_TODOLIST
 */
async function getAllItem(ID_TODOLIST: string) {
  return await itemRepo.find({ where: { todolist: ID_TODOLIST } });
}

/**
 * Detruut tous l'user et la todolist crées
 */
async function deleteUserAndTodolist() {
  await userRepo.delete(ID_USER);
  await todolistRepo.delete(ID_TODOLIST);
}

/**
 * Créer un item soumis ou un item modèle
 * @param item
 * @param uuid
 * @param shouldDateBeOld
 */
async function createItem(
  item?: CreateItemDto,
  uuid?: string,
  shouldDateBeOld?: boolean,
) {
  if (!!item) {
    await itemRepo.save(item);
    return;
  }
  await itemRepo.save(getModelValidItem(uuid, shouldDateBeOld));
}

/**
 * Donne le patron d'un item déjà prêt
 * @param uuid
 * @param shouldDateBeOld
 */
function getModelValidItem(uuid?: string, shouldDateBeOld?: boolean) {
  const date = new Date();
  if (shouldDateBeOld) {
    // réglage e la date en fonction de la règle métier
    date.setTime(new Date().getTime() - Constants.LIMIT_BETWEEN_CREATION * 2);
  }
  return {
    id: !!uuid ? uuid : getUUID(),
    // Random Name
    name: Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substr(0, 5),
    content: new Array(+10).join('xyz'),
    createdDate: date.toISOString(),
    todolist: todoList,
  };
}

/**
 * Permet de créer plusieurs Item d'un coup
 * @param nbrItem
 * @param shouldDateBeOld
 */
async function factoryRandomValidItem(
  nbrItem?: number,
  shouldDateBeOld?: boolean,
) {
  nbrItem = !!nbrItem ? nbrItem : 0;
  for (let ind = 0; ind < nbrItem; ind++) {
    await createItem(null, null, shouldDateBeOld);
  }
}

/**
 * Permet de supprimer tout les items d'une todolist
 */
async function deleteAllItem() {
  const items = await getAllItem(ID_TODOLIST);
  for (const item of items) {
    await itemRepo.delete(item.id);
  }
}

/**
 * Donne une UUID v4 aléatoire
 */
function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
