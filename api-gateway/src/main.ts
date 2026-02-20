import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import type { Request } from 'express';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    express.json({
      verify: (req: RequestWithRawBody, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
  });

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('');

  const port = process.env.PORT || 8000;
  await app.listen(port);
}

void bootstrap();
