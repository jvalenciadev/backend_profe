import { NestFactory } from '@nestjs/core';
import { AuditModule } from './audit.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AuditModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  setupBigIntSerialization();
  await app.listen(process.env.AUDIT_PORT ?? 3005);
}
bootstrap();
