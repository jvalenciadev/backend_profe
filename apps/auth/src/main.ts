import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  setupBigIntSerialization();
  await app.listen(process.env.AUTH_PORT ?? 3001);
}
bootstrap();
