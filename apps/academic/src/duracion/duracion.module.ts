import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { DURACION_REPOSITORY } from './domain/repositories/duracion.repository.interface';
import { PrismaDuracionRepository } from './infrastructure/database/prisma-duracion.repository';
import { DuracionController } from './infrastructure/controllers/duracion.controller';
import {
  GetDuracionsUseCase,
  GetDuracionByIdUseCase,
  CreateDuracionUseCase,
  UpdateDuracionUseCase,
  DeleteDuracionUseCase,
} from './application/use-cases/duracion.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [DuracionController],
  providers: [
    { provide: DURACION_REPOSITORY, useClass: PrismaDuracionRepository },
    GetDuracionsUseCase,
    GetDuracionByIdUseCase,
    CreateDuracionUseCase,
    UpdateDuracionUseCase,
    DeleteDuracionUseCase,
  ],
  exports: [GetDuracionsUseCase, GetDuracionByIdUseCase],
})
export class DuracionModule {}
