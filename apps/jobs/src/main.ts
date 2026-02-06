import { NestFactory } from '@nestjs/core';
import { JobsModule } from './jobs.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(JobsModule);
  setupBigIntSerialization();
  await app.listen(process.env.JOBS_PORT ?? 3006);
}
bootstrap();
