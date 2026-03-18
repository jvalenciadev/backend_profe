import { NestFactory } from '@nestjs/core';
import { LmsModule } from './lms.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LmsModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api/aula');

  // Servir archivos estáticos desde la carpeta uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  setupBigIntSerialization();

  const port = process.env.LMS_PORT ?? 3008;
  await app.listen(port);
  console.log(`🚀 LMS Backend running on: http://localhost:${port}/api/aula`);
}
bootstrap();
