import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readSecret } from '../utils/secret.util';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const directUrl = process.env.DB_CONNECTION;
    const dbUser = readSecret('DB_USER');
    const dbPassword = readSecret('DB_PASSWORD');
    const dbHost = process.env.DB_HOST ?? 'postgres';
    const dbPort = process.env.DB_PORT ?? '5432';
    const dbName = process.env.DB_NAME;

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
