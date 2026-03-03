import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { CALIFICACION_REPOSITORY } from './domain/repositories/calificacion.repository.interface';
import { PrismaCalificacionRepository } from './infrastructure/database/prisma-calificacion.repository';
import { CalificacionController } from './infrastructure/controllers/calificacion.controller';
import {
  GetCalificacionsUseCase, GetCalificacionByIdUseCase, CreateCalificacionUseCase, UpdateCalificacionUseCase, DeleteCalificacionUseCase
} from './application/use-cases/calificacion.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [CalificacionController],
  providers: [
    { provide: CALIFICACION_REPOSITORY, useClass: PrismaCalificacionRepository },
    GetCalificacionsUseCase,
    GetCalificacionByIdUseCase,
    CreateCalificacionUseCase,
    UpdateCalificacionUseCase,
    DeleteCalificacionUseCase,
  ],
  exports: [GetCalificacionsUseCase, GetCalificacionByIdUseCase]
})
export class CalificacionModule {}