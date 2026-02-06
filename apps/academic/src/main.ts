import { NestFactory } from '@nestjs/core';
import { AcademicModule } from './academic.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(AcademicModule);
  setupBigIntSerialization();
  await app.listen(process.env.ACADEMIC_PORT ?? 3004);
}
bootstrap();
