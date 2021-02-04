import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateItemDto } from 'src/item/dto/create-item.dto';
import { ItemService } from 'src/item/item.service';
import { Constants } from 'src/shared/constants';

/**
 * Guard vérifiant qu'un item peut bien être créer (si la dernière création remonde a + de 30min)
 */
@Injectable()
export class ItemCreationGuard implements CanActivate {
  constructor(private itemService: ItemService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.resolve(
      context.switchToHttp().getRequest().body,
    );
  }

  async resolve(createItem: CreateItemDto) {
    try {
      return await this.itemService.isItemUniqueInTodolist({
        ...createItem,
      });
    } catch (e) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: e.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
