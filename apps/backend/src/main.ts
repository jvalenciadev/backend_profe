import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Aumentar límites de tamaño del body (necesario para importaciones masivas)
  const express = require('express');
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Basic configurations
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Force UTF-8 encoding for all API responses, excluding static files
  app.use((req, res, next) => {
    if (!req.url.startsWith('/uploads')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
  });

  // Support for BigInt serialization
  setupBigIntSerialization();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Monolithic Server running on: http://localhost:${port}`);
}
bootstrap();
// Hot-reload trigger
