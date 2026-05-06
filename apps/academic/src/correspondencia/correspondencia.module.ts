import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CorrespondenciaController } from './correspondencia.controller';
import { CorrespondenciaService } from './correspondencia.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CorrespondenciaController],
  providers: [CorrespondenciaService],
  exports: [CorrespondenciaService],
})
export class CorrespondenciaModule {}
