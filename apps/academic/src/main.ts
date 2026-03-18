import { NestFactory } from '@nestjs/core'; // Force reload for Prisma Schema update
import { AcademicModule } from './academic.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AcademicModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  // Force UTF-8 encoding for all API responses, excluding static files
  app.use((req, res, next) => {
    if (!req.url.startsWith('/uploads')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
  });

  setupBigIntSerialization();
  await app.listen(process.env.ACADEMIC_PORT ?? 3004);
}
bootstrap();
