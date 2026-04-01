import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { EVALUACION_REPOSITORY } from './domain/repositories/evaluacion.repository.interface';
import { PrismaEvaluacionRepository } from './infrastructure/database/prisma-evaluacion.repository';
import { EvaluationsController } from './infrastructure/controllers/evaluations.controller';
import {
  CreatePeriodoUseCase,
  GetPeriodosUseCase,
  GetPeriodoByIdUseCase,
  TogglePeriodoUseCase,
  DeletePeriodoUseCase,
} from './application/use-cases/periodo.use-cases';
import {
  CreateEvaluacionUseCase,
  GetEvaluacionesUseCase,
  GetEvaluacionByIdUseCase,
  GetMyEvaluacionesUseCase,
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
    GetPeriodosUseCase,
    GetPeriodoByIdUseCase,
    TogglePeriodoUseCase,
    DeletePeriodoUseCase,
    // Evaluaciones
    CreateEvaluacionUseCase,
    GetEvaluacionesUseCase,
    GetEvaluacionByIdUseCase,
    GetMyEvaluacionesUseCase,
    VerifyEvaluacionCodeUseCase,
    GetUsersToEvaluateUseCase,
    // Infraestructura
    GeneratePDFUseCase,
  ],
})
export class EvaluationsModule {}
