import { NestFactory } from '@nestjs/core';
import { LmsModule } from './lms.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LmsModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api/aula');

  // Servir archivos estáticos desde la carpeta uploads de forma segura contra XSS
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'");
      res.set('Cache-Control', 'public, max-age=31536000');
    },
  });

  setupBigIntSerialization();

  const port = process.env.LMS_PORT ?? 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 LMS Backend running on: http://0.0.0.0:${port}/api/aula`);
}
bootstrap();
