import { NestFactory } from '@nestjs/core';
import { AcademicModule } from './academic.module';

async function bootstrap() {
  const app = await NestFactory.create(AcademicModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
