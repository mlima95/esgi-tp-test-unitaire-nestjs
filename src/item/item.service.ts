import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { TodolistService } from 'src/todolist/todolist.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Constants } from 'src/shared/constants';
import { MailerService } from 'src/shared/services/mailer/mailer.service';
import { validate } from 'class-validator';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    private todolistService: TodolistService,
    private mailerService: MailerService,
  ) {}

  getRepository() {
    return this.itemRepository;
  }

  async create(createItemDto: CreateItemDto) {
    try {
      await this.isItemNumberExceed(createItemDto);
      await this.isItemTimeLimit(createItemDto);
      await this.isValid(new Item(createItemDto));
      await this.isItemContentLength(createItemDto);
      const item = await this.itemRepository.save(createItemDto);
      if (!item) {
        throw new HttpException(
          Constants.ERROR_MSG_ITEM_DIDNT_CREATE,
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.sendMail(item.todolist.id);
      return item;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Décide d'envoyé un mail ou non
   * @param todolistItems
   */
  async sendMail(todoListId: string) {
    const items = await this.todolistService.findAllItems(todoListId);
    if (items.length === Constants.ITEM_NUMBER_TO_SEND_MAIL) {
      // On récupère le mail de l'user
      return this.mailerService.sendMail(
        items[0].todolist.user.email,
        Constants.MAIL_ITEM_CAPACITY_SOON_EXCEED,
      );
    }
    return false;
  }

  /**
   * Return all items of a todolist
   * @param todolistId
   */
  async findAllOfTodolist(todolistId: string) {
    return await this.todolistService.findAllItems(todolistId);
  }

  async findOne(id: string) {
    try {
      return await this.itemRepository.findOne(id);
    } catch (e) {
      throw new HttpException(
        Constants.ERROR_MSG_ITEM_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    try {
      return await this.itemRepository.update(id, updateItemDto);
    } catch (e) {
      throw new HttpException(
        Constants.ERROR_MSG_ITEM_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Supprimer un item par id
   * @param id
   */
  async delete(id: string) {
    try {
      return await this.itemRepository.delete(id);
    } catch (e) {
      throw new HttpException(
        Constants.ERROR_MSG_ITEM_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Supprimer un ensemble d'item
   * @param items
   */
  async remove(items: Item[]) {
    return await this.itemRepository.remove(items);
  }

  /**
   * Informe sur l'unicité d'un item dans la base de donnée
   * AU sein de sa todolist
   * @param item
   */
  async isItemUniqueInTodolist(item: CreateItemDto): Promise<boolean> {
    // Récupération des items de la todolist
    const items: Item[] = await this.todolistService.findAllItems(
      item.todolist.id,
    );
    // Push du nouvelle item
    items.push({ ...item, createdDate: null });

    // Réponse sur l'unicité donnée ;
    // les size après coup
    const withoutDup = this.removeDuplicates(items, 'name');
    const res = withoutDup.length === items.length;
    if (!res) {
      throw new HttpException(
        Constants.ERROR_MSG_ITEM_NAME_NOT_UNIQUE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return res;
  }

  /**
   * Vérifie que le content d'un item a la taille désiré
   * @param item
   */
  async isItemContentLength(item: CreateItemDto) {
    if (!!item.content.length) {
      if (item.content.length >= Constants.MAX_CONTENT_LENGTH_STR) {
        throw new HttpException(
          Constants.ERROR_MSG_LENGTH_CONTENT,
          HttpStatus.BAD_REQUEST,
        );
      }
      return true;
    }
    return false;
  }

  /**
   * Retourne le dernier item créé
   * @param todoListId
   */
  async findLastItemOfTodolist(todoListId: string) {
    return await this.itemRepository.find({
      where: {
        todolist: todoListId,
      },
      relations: ['todolist'],
      order: {
        createdDate: 'DESC',
      },
      take: 1,
    });
  }

  private removeDuplicates(array, key) {
    const lookup = {};
    const result = [];
    array.forEach((element) => {
      if (!lookup[element[key]]) {
        lookup[element[key]] = true;
        result.push(element);
      }
    });
    return result;
  }

  async isValid(item: Item) {
    const toValidate = new CreateItemDto(item);
    // récupération des possibles erreurs
    const errors = await validate(toValidate);
    //s'il y a des erreurs
    if (errors.length) {
      // préparation de la réponse final
      let strError = '';

      // Loop sur les erreurs pour les récupérer toutes
      for (const error of errors) {
        // S'il y a des contraintes
        if (!!error.constraints) {
          // Loop sur les contraintes pour les récupérer toutes
          for (const constraint in error.constraints) {
            // concaténer les erreurs à la réponse finales
            strError += `${error.constraints[constraint]}`;
          }
        } else {
          // Des erreurs et pas de contraintes, ne doit jamais arrivé
          // défaillance de la librairie class-validator
          strError += Constants.ERROR_MSG_UNKNOWN_ERROR;
        }
      }
      // Throw d'une erreur avec la réponse finale en message
      throw new HttpException(strError, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Vérifie si le dernière item enregistré a plus de 30min
   * @param item
   */
  async isItemTimeLimit(item: Item | CreateItemDto) {
    // On récupère la liste des items
    const items = await this.findLastItemOfTodolist(item.todolist.id);
    // L'item est présent, on vérifie
    if (!!items[0] && !!items[0].createdDate) {
      // Il y a une date, on la compare à la date actuelle
      // Si le résultat de la soustraction du temps de la date enregistrée
      // et celui de la date actuelle est infierieur à la limite, on refuse l'accès
      const timeBetweenDate =
        new Date().getTime() - items[0].createdDate.getTime();
      const err = timeBetweenDate < Constants.LIMIT_BETWEEN_CREATION;
      if (err) {
        throw new HttpException(
          Constants.ERROR_MSG_LIMIT_BETWEEN_ITEM_CREATION,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Vérifie que le nombre d'item dans la todolist est conforme
   * @param item
   */
  async isItemNumberExceed(item: CreateItemDto | Item) {
    // On récupère la liste des items
    const items = await this.todolistService.findAllItems(item.todolist.id);
    // Si pas d'item, on peut ajouter
    if (items.length <= 0) return;
    if (items.length >= Constants.MAX_ITEM_LENGTH)
      throw new HttpException(
        Constants.ERROR_MSG_LIMIT_ITEM_EXCEED,
        HttpStatus.BAD_REQUEST,
      );
  }
}
