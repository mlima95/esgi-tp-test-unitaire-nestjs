import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TodolistModule } from './todolist/todolist.module';
import { ItemModule } from './item/item.module';
import { SharedModule } from './shared/shared.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Module({
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
    TodolistModule,
    ItemModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {
  constructor(private connection: Connection) {}
}
