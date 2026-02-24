import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersInfo } from './entities/users_info.entity';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, UsersInfo])],
  controllers: [UsersController],
  providers: [UsersService, AuthGuard, AdminGuard],
})
export class UsersModule {}
