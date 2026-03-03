import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { EVALUACIONPERIODO_REPOSITORY } from './domain/repositories/evaluacionPeriodo.repository.interface';
import { PrismaEvaluacionPeriodoRepository } from './infrastructure/database/prisma-evaluacionPeriodo.repository';
import { EvaluacionPeriodoController } from './infrastructure/controllers/evaluacionPeriodo.controller';
import { CreateEvaluacionPeriodoUseCase } from './application/use-cases/create-evaluacionPeriodo.use-case';
import { GetEvaluacionPeriodosUseCase, GetEvaluacionPeriodoByIdUseCase } from './application/use-cases/get-evaluacionPeriodos.use-case';
import { UpdateEvaluacionPeriodoUseCase, DeleteEvaluacionPeriodoUseCase } from './application/use-cases/update-evaluacionPeriodo.use-case';

@Module({
  imports: [DatabaseModule],
  controllers: [EvaluacionPeriodoController],
  providers: [
    { provide: EVALUACIONPERIODO_REPOSITORY, useClass: PrismaEvaluacionPeriodoRepository },
    CreateEvaluacionPeriodoUseCase,
    GetEvaluacionPeriodosUseCase,
    GetEvaluacionPeriodoByIdUseCase,
    UpdateEvaluacionPeriodoUseCase,
    DeleteEvaluacionPeriodoUseCase,
  ],
  exports: [GetEvaluacionPeriodosUseCase],
})
export class EvaluacionPeriodoModule {}
