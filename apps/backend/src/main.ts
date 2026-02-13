import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

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
