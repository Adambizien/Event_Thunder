import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersInfo } from './entities/users_info.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyUserDto } from './dto/verify-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePasswordWithEmailDto } from './dto/update-password-with-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type UserEntity = User & { _id?: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UsersInfo)
    private usersInfoRepository: Repository<UsersInfo>,
  ) {}

  private toUserResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id || user._id?.toString() || '',
      firstName: user.info?.first_name ?? undefined,
      lastName: user.info?.last_name ?? undefined,
      email: user.email,
      phoneNumber: user.info?.phone_number ?? undefined,
      role: user.role,
      planId: user.plan_id,
    };
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponseDto }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet e-mail existe déjà');
    }

    const user = this.userRepository.create({
      email: createUserDto.email,
      password: createUserDto.password,
    });
    await this.userRepository.save(user);

    const info = this.usersInfoRepository.create({
      user_id: user.id,
      first_name: createUserDto.firstName || '',
      last_name: createUserDto.lastName || '',
      phone_number: createUserDto.phoneNumber || '',
    });
    await this.usersInfoRepository.save(info);

    user.info = info;

    return { user: this.toUserResponse(user) };
  }

  async verify(
    verifyUserDto: VerifyUserDto,
  ): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({
      where: { email: verifyUserDto.email },
      relations: ['info'],
    });
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
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['info'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user) };
  }

  async findByEmail(email: string): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['info'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user) };
  }

  async updatePassword(
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: updatePasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    user.password = updatePasswordDto.newPassword;
    await this.userRepository.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  async updateProfile(
    updateProfileDto: UpdateProfileDto,
  ): Promise<{ user: UserResponseDto }> {
    const user = await this.userRepository.findOne({
      where: { email: updateProfileDto.email },
      relations: ['info'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Update email if different
    if (updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          'Un utilisateur avec cet e-mail existe déjà',
        );
      }
      user.email = updateProfileDto.email;
    }

    // Update or create user info
    if (user.info) {
      user.info.first_name = updateProfileDto.firstName;
      user.info.last_name = updateProfileDto.lastName;
      user.info.phone_number = updateProfileDto.phoneNumber || '';
      await this.usersInfoRepository.save(user.info);
    } else {
      const info = this.usersInfoRepository.create({
        user_id: user.id,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: updateProfileDto.phoneNumber || '',
      });
      user.info = await this.usersInfoRepository.save(info);
    }

    await this.userRepository.save(user);

    return { user: this.toUserResponse(user) };
  }

  async updatePasswordWithEmail(
    updatePasswordDto: UpdatePasswordWithEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: updatePasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isMatch = await user.comparePassword(
      updatePasswordDto.currentPassword,
    );
    if (!isMatch) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    user.password = updatePasswordDto.newPassword;
    await this.userRepository.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  healthCheck(): Promise<{ message: string }> {
    return Promise.resolve({ message: 'Le service utilisateur fonctionne' });
  }
}
