import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw new BadRequestException('Le nom de catégorie est requis');
    }

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Cette catégorie existe déjà');
    }

    return this.prisma.category.create({
      data: {
        name,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const name = dto.name.trim();
    if (name.length === 0) {
      throw new BadRequestException('Le nom de catégorie est requis');
    }

    const targetCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!targetCategory) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id: {
          not: id,
        },
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Cette catégorie existe déjà');
    }

    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  async remove(id: string) {
    const linkedEventsCount = await this.prisma.event.count({
      where: {
        category_id: id,
      },
    });

    if (linkedEventsCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer cette catégorie car elle est utilisée par des événements',
      );
    }

    try {
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Catégorie introuvable');
        }
      }

      throw error;
    }
  }
}
