import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.event.findMany({
      include: {
        category: true,
      },
      orderBy: {
        start_date: 'asc',
      },
    });
  }

  async getOne(id: string, userId?: string, userRole?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    if (event.status === EventStatus.draft) {
      const isAdmin = userRole === 'Admin';
      const isCreator = Boolean(userId) && userId === event.creator_id;

      if (!isAdmin && !isCreator) {
        throw new ForbiddenException('Cet evenement est inaccessible');
      }
    }

    return event;
  }

  async create(dto: CreateEventDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Dates invalides');
    }

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }

    const event = await this.prisma.event.create({
      data: {
        creator_id: dto.creator_id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category_id: dto.category_id,
        location: dto.location.trim(),
        address: dto.address.trim(),
        start_date: startDate,
        end_date: endDate,
        image_url: dto.image_url?.trim() || '',
        status: dto.status ?? EventStatus.draft,
      },
      include: {
        category: true,
      },
    });

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evenement introuvable');
    }

    if (dto.category_id) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Categorie introuvable');
      }
    }

    const startDate = dto.start_date
      ? new Date(dto.start_date)
      : existingEvent.start_date;
    const endDate = dto.end_date ? new Date(dto.end_date) : existingEvent.end_date;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Dates invalides');
    }

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La date de fin doit etre posterieure a la date de debut',
      );
    }

    const data: Prisma.EventUpdateInput = {
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      location: dto.location?.trim(),
      address: dto.address?.trim(),
      category: dto.category_id
        ? {
            connect: {
              id: dto.category_id,
            },
          }
        : undefined,
      image_url:
        dto.image_url === undefined ? undefined : dto.image_url.trim(),
      status: dto.status,
      start_date: startDate,
      end_date: endDate,
    };

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.event.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Evenement introuvable');
        }
      }

      throw error;
    }
  }
}