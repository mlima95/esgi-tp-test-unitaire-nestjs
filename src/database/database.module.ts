import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'root',
        password: 'root',
        database: 'todolist',
        migrationsRun: true,
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: true,
        migrations: ['dist/**/migration/*.js'],
        keepConnectionAlive: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
