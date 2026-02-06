import { NestFactory } from '@nestjs/core';
import { TerritorialModule } from './territorial.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(TerritorialModule);
  setupBigIntSerialization();
  await app.listen(process.env.TERRITORIAL_PORT ?? 3002);
}
bootstrap();
