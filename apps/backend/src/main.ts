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

  // Support for BigInt serialization
  setupBigIntSerialization();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Monolithic Server running on: http://localhost:${port}`);
}
bootstrap();
