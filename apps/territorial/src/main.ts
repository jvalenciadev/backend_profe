import { NestFactory } from '@nestjs/core';
import { TerritorialModule } from './territorial.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(TerritorialModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  // Force UTF-8 for all API responses, excluding static files
  app.use((req, res, next) => {
    if (!req.url.startsWith('/uploads')) {
      res.header('Content-Type', 'application/json; charset=utf-8');
    }
    next();
  });

  setupBigIntSerialization();
  await app.listen(process.env.TERRITORIAL_PORT ?? 3002);
}
bootstrap();
