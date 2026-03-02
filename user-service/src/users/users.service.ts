import { UpdateRoleDto } from './dto/update-role.dto';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyUserDto } from './dto/verify-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePasswordWithEmailDto } from './dto/update-password-with-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

type UserEntity = {
  id: string;
  email: string;
  role: UserRole;
  info?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      return password;
    }
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  private toUserResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id || '',
      firstName: user.info?.first_name ?? undefined,
      lastName: user.info?.last_name ?? undefined,
      email: user.email,
      phoneNumber: user.info?.phone_number ?? undefined,
      role: user.role,
    };
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponseDto }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet e-mail existe déjà');
    }

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: await this.hashPassword(createUserDto.password),
        info: {
          create: {
            first_name: createUserDto.firstName || '',
            last_name: createUserDto.lastName || '',
            phone_number: createUserDto.phoneNumber || '',
          },
        },
      },
      include: { info: true },
    });

    return { user: this.toUserResponse(user as unknown as UserEntity) };
  }

  async verify(
    verifyUserDto: VerifyUserDto,
  ): Promise<{ user: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { email: verifyUserDto.email },
      include: { info: true },
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(verifyUserDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return { user: this.toUserResponse(user as unknown as UserEntity) };
  }

  async findById(id: string): Promise<{ user: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { info: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user as unknown as UserEntity) };
  }

  async findByEmail(email: string): Promise<{ user: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { info: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { user: this.toUserResponse(user as unknown as UserEntity) };
  }

  async updatePassword(
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: updatePasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.hashPassword(updatePasswordDto.newPassword),
      },
    });

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  async updateProfile(
    updateProfileDto: UpdateProfileDto,
  ): Promise<{ user: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { email: updateProfileDto.currentEmail },
      include: { info: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (updateProfileDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          'Un utilisateur avec cet e-mail existe déjà',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: updateProfileDto.email,
        info: {
          upsert: {
            update: {
              first_name: updateProfileDto.firstName,
              last_name: updateProfileDto.lastName,
              phone_number: updateProfileDto.phoneNumber || '',
            },
            create: {
              first_name: updateProfileDto.firstName,
              last_name: updateProfileDto.lastName,
              phone_number: updateProfileDto.phoneNumber || '',
            },
          },
        },
      },
      include: { info: true },
    });

    return { user: this.toUserResponse(updated as unknown as UserEntity) };
  }

  async updatePasswordWithEmail(
    updatePasswordDto: UpdatePasswordWithEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: updatePasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isMatch = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.hashPassword(updatePasswordDto.newPassword),
      },
    });

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  healthCheck(): Promise<{ message: string }> {
    return Promise.resolve({ message: 'Le service utilisateur fonctionne' });
  }

  async getAllUsers(): Promise<{ users: UserResponseDto[] }> {
    const users = await this.prisma.user.findMany({
      include: { info: true },
    });
    return {
      users: users.map((user) =>
        this.toUserResponse(user as unknown as UserEntity),
      ),
    };
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'Utilisateur supp rimé avec succès' };
  }

  async updateRole(
    updateRoleDto: UpdateRoleDto,
  ): Promise<{ user: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { id: updateRoleDto.userId },
      include: { info: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const updated = await this.prisma.user.update({
      where: { id: updateRoleDto.userId },
      data: { role: updateRoleDto.role },
      include: { info: true },
    });
    return { user: this.toUserResponse(updated as unknown as UserEntity) };
  }
}
