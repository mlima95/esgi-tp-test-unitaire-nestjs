import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreateItemDto } from 'src/item/dto/create-item.dto';
import { ItemService } from 'src/item/item.service';

@Injectable()
export class ItemNameUniqueGuard implements CanActivate {
  constructor(private itemService: ItemService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.resolve(context.switchToHttp().getRequest().body);
  }

  async resolve(item: CreateItemDto) {
    try {
      return this.itemService.isItemContentLength(item);
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
