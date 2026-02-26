import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { readSecret } from './utils/secret.util';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const directUrl = configService.get<string>('DB_CONNECTION');
        const dbUser = readSecret('DB_USER');
        const dbPassword = readSecret('DB_PASSWORD');
        const dbHost = configService.get<string>('DB_HOST') ?? 'postgres';
        const dbPort = configService.get<string>('DB_PORT') ?? '5432';
        const dbName = configService.get<string>('DB_NAME');
        const url =
          directUrl ??
          (dbUser && dbPassword && dbName
            ? `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`
            : undefined);
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
        } as const;
      },
    }),
    SubscriptionsModule,
  ],
})
export class AppModule {}
