import { NestFactory } from '@nestjs/core';
import { AuditModule } from './audit.module';
import { setupBigIntSerialization } from '@app/common/utils/bigint.serializer';

async function bootstrap() {
  const app = await NestFactory.create(AuditModule);
  setupBigIntSerialization();
  await app.listen(process.env.AUDIT_PORT ?? 3005);
}
bootstrap();
