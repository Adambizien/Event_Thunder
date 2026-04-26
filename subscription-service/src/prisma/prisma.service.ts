import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { readSecret } from '../utils/secret.util';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const directUrl = configService.get<string>('DB_CONNECTION');
    const dbUser = readSecret('DB_USER');
    const dbPassword = readSecret('DB_PASSWORD');
    const dbHost = configService.get<string>('DB_HOST') ?? 'postgres';
    const dbPort = configService.get<string>('DB_PORT') ?? '5432';
    const dbName = configService.get<string>('DB_NAME');
    const url =
      directUrl ??
      (dbUser && dbPassword && dbName
        ? `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`
        : undefined);

    super({
      datasources: url
        ? {
            db: {
              url,
            },
          }
        : undefined,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
