import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyUserDto } from './dto/verify-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  private toUserResponse(user: any): UserResponseDto {
    return {
      id: (user as any).id || (user as any)._id?.toString(),
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      email: (user as any).email,
    };
  }

  async create(createUserDto: CreateUserDto): Promise<{ user: UserResponseDto }> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet e-mail existe déjà');
    }

    const user = this.userRepository.create(createUserDto as any);
    await this.userRepository.save(user);

    return { user: this.toUserResponse(user) };
  }

  async verify(verifyUserDto: VerifyUserDto): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({ where: { email: verifyUserDto.email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isMatch = await user.comparePassword(verifyUserDto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return { user: this.toUserResponse(user) };
  }

  async findById(id: string): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user) };
  }

  async findByEmail(email: string): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user) };
  }

  async healthCheck(): Promise<{ message: string }> {
    return { message: 'Le service utilisateur fonctionne' };
  }
}