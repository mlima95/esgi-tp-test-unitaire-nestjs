import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class CanUserCreateItemGuard implements CanActivate {
  constructor(private userService: UserService) {}
  async canActivate(context: ExecutionContext) {
    // Get de l'user
    const user = await this.userService.findOne(
      context.switchToHttp().getRequest().body.todolist.user.id,
    );

    return await this.resolve(user);
  }

  async resolve(user: User) {
    // SI l'user existe, on return s'il est valide ou non
    if (!!user) {
      const u = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        password: user.password,
        birthDate: new Date(user.birthDate).toISOString(),
        isValid: user.isValid,
      };
      return !!(await this.userService.isValid(u));
    }
    // SI l'user n'existe pas, il n'a pas le droit, on return false
    return false;
  }
}
