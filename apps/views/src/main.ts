import { NestFactory } from '@nestjs/core';
import { ViewsModule } from './views.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(ViewsModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  setupBigIntSerialization();

  const port = process.env.VIEWS_PORT || 3005;
  await app.listen(port);
  console.log(`📡 Public Views Service running on: http://localhost:${port}`);
}
bootstrap();
