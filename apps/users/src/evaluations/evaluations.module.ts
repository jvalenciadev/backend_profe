import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { EVALUACION_REPOSITORY } from './domain/repositories/evaluacion.repository.interface';
import { PrismaEvaluacionRepository } from './infrastructure/database/prisma-evaluacion.repository';
import { EvaluationsController } from './infrastructure/controllers/evaluations.controller';
import {
  CreatePeriodoUseCase,
  UpdatePeriodoUseCase,
  GetPeriodosUseCase,
  GetPeriodoByIdUseCase,
  TogglePeriodoUseCase,
  DeletePeriodoUseCase,
} from './application/use-cases/periodo.use-cases';
import {
  CreateCuestionarioUseCase,
  GetCuestionariosUseCase,
  GetCuestionarioByIdUseCase,
  GetCuestionariosByCargoUseCase,
  UpdateCuestionarioUseCase,
  DeleteCuestionarioUseCase,
} from './application/use-cases/cuestionario.use-cases';
import {
  CreateAsignacionUseCase,
  CreateAsignacionesMasivasUseCase,
  GetAsignacionesByEvaluadorUseCase,
  GetAsignacionesByEvaluadoUseCase,
  GetAsignacionByIdUseCase,
  GetAllAsignacionesUseCase,
  DeleteAsignacionUseCase,
} from './application/use-cases/asignacion.use-cases';
import {
  IniciarIntentoUseCase,
  ResponderIntentoUseCase,
  GetIntentoByIdUseCase,
  GetConsolidadoEvaluadoUseCase,
  VerifyEvaluacionCodeUseCase,
  GetUsersToEvaluateUseCase,
} from './application/use-cases/evaluacion.use-cases';
import { GeneratePDFUseCase } from './application/use-cases/generate-pdf.use-case';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [EvaluationsController],
  providers: [
    { provide: EVALUACION_REPOSITORY, useClass: PrismaEvaluacionRepository },
    // Períodos
    CreatePeriodoUseCase,
    UpdatePeriodoUseCase,
    GetPeriodosUseCase,
    GetPeriodoByIdUseCase,
    TogglePeriodoUseCase,
    DeletePeriodoUseCase,
    // Cuestionarios
    CreateCuestionarioUseCase,
    GetCuestionariosUseCase,
    GetCuestionarioByIdUseCase,
    GetCuestionariosByCargoUseCase,
    UpdateCuestionarioUseCase,
    DeleteCuestionarioUseCase,
    // Asignaciones
    CreateAsignacionUseCase,
    CreateAsignacionesMasivasUseCase,
    GetAsignacionesByEvaluadorUseCase,
    GetAsignacionesByEvaluadoUseCase,
    GetAsignacionByIdUseCase,
    GetAllAsignacionesUseCase,
    DeleteAsignacionUseCase,
    // Intentos & Respuestas
    IniciarIntentoUseCase,
    ResponderIntentoUseCase,
    GetIntentoByIdUseCase,
    GetConsolidadoEvaluadoUseCase,
    VerifyEvaluacionCodeUseCase,
    GetUsersToEvaluateUseCase,
    // Infraestructura / PDF
    GeneratePDFUseCase,
  ],
})
export class EvaluationsModule {}
