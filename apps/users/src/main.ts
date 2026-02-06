import { NestFactory } from '@nestjs/core';
import { UsersModule } from './users.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  setupBigIntSerialization();
  await app.listen(process.env.USERS_PORT ?? 3003);
}
bootstrap();
