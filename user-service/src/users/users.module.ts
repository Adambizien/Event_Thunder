import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersInfo } from './entities/users_info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UsersInfo])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
