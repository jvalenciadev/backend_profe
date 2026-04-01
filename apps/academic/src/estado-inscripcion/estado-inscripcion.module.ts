import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CaslModule } from '@app/common';
import { ESTADOINSCRIPCION_REPOSITORY } from './domain/repositories/estado-inscripcion.repository.interface';
import { PrismaEstadoInscripcionRepository } from './infrastructure/database/prisma-estado-inscripcion.repository';
import { EstadoInscripcionController } from './infrastructure/controllers/estado-inscripcion.controller';
import {
  GetEstadoInscripcionsUseCase,
  GetEstadoInscripcionByIdUseCase,
  CreateEstadoInscripcionUseCase,
  UpdateEstadoInscripcionUseCase,
  DeleteEstadoInscripcionUseCase,
} from './application/use-cases/estado-inscripcion.use-cases';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [EstadoInscripcionController],
  providers: [
    {
      provide: ESTADOINSCRIPCION_REPOSITORY,
      useClass: PrismaEstadoInscripcionRepository,
    },
    GetEstadoInscripcionsUseCase,
    GetEstadoInscripcionByIdUseCase,
    CreateEstadoInscripcionUseCase,
    UpdateEstadoInscripcionUseCase,
    DeleteEstadoInscripcionUseCase,
  ],
  exports: [GetEstadoInscripcionsUseCase, GetEstadoInscripcionByIdUseCase],
})
export class EstadoInscripcionModule {}
