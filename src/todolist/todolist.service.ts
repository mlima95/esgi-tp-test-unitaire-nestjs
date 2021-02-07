import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateTodolistDto } from './dto/create-todolist.dto';
import { UpdateTodolistDto } from './dto/update-todolist.dto';
import { Todolist } from './entities/todolist.entity';
import { User } from '../user/entities/user.entity';
import { Constants } from '../shared/constants';

@Injectable()
export class TodolistService {
  constructor(
    @InjectRepository(Todolist)
    private todolistRepository: Repository<Todolist>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  getRepository() {
    return this.todolistRepository;
  }

  async isTodolistUniqueForUser(userId) {
    return await this.userRepository.findOne({
      where: {
        id: userId,
      },
      relations: ['todolist'],
    });
  }

  async create(createTodolistDto: CreateTodolistDto) {
    const user = await this.isTodolistUniqueForUser(createTodolistDto.user.id);
    if (!user.todolist) {
      return this.todolistRepository.save(createTodolistDto);
    } else {
      throw new HttpException(
        Constants.ERROR_MSG_USER_ALREADY_HAVE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll() {
    return await this.todolistRepository.find();
  }

  async findOne(
    id: string,
    options?: FindOneOptions<Todolist>,
  ): Promise<Todolist> {
    return await this.todolistRepository.findOne(id);
  }

  async update(id: string, updateTodolistDto: UpdateTodolistDto) {
    return await this.todolistRepository.update(id, updateTodolistDto);
  }

  /**
   * Return all of a todolist items
   * @param id
   */
  async findAllItems(id: string) {
    const t = await this.todolistRepository.findOne(id, {
      relations: ['user', 'items', 'items.todolist', 'items.todolist.user'],
    });
    return t.items;
  }

  async delete(id: string) {
    await this.todolistRepository.delete(id);
  }
}
