import { NestFactory } from '@nestjs/core';
import { TerritorialModule } from './territorial.module';

async function bootstrap() {
  const app = await NestFactory.create(TerritorialModule);
  await app.listen(process.env.TERRITORIAL_PORT ?? 3002);
}
bootstrap();
