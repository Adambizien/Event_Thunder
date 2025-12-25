import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Activer CORS avec des paramètres permissifs pour le développement
  app.enableCors({
    origin: true, // Permettre toutes les origines en développement
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
  console.log(`🚀 API Gateway (Nest) running on port ${port}`);
}

bootstrap();
