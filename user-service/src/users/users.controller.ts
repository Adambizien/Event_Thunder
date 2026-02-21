import { UpdateRoleDto } from './dto/update-role.dto';

import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyUserDto } from './dto/verify-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePasswordWithEmailDto } from './dto/update-password-with-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() verifyUserDto: VerifyUserDto) {
    return this.usersService.verify(verifyUserDto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.usersService.updatePassword(updatePasswordDto);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(updateProfileDto);
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  async updatePasswordWithEmail(
    @Body() updatePasswordDto: UpdatePasswordWithEmailDto,
  ) {
    return this.usersService.updatePasswordWithEmail(updatePasswordDto);
  }

  @Get('health')
  healthCheck() {
    return this.usersService.healthCheck();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Patch('role')
  @HttpCode(HttpStatus.OK)
  async updateRole(@Body() updateRoleDto: UpdateRoleDto) {
    return this.usersService.updateRole(updateRoleDto);
  }
}
