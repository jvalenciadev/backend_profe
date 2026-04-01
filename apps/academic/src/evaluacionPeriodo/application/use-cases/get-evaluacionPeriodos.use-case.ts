import { Injectable, Inject } from '@nestjs/common';
import {
  EVALUACIONPERIODO_REPOSITORY,
  EvaluacionPeriodoFilters,
} from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import type { IEvaluacionPeriodoRepository } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import { EvaluacionPeriodo } from '../../domain/entities/evaluacionPeriodo.entity';

@Injectable()
export class GetEvaluacionPeriodosUseCase {
  constructor(
    @Inject(EVALUACIONPERIODO_REPOSITORY)
    private readonly repository: IEvaluacionPeriodoRepository,
  ) {}

  async execute(
    filters: EvaluacionPeriodoFilters = {},
  ): Promise<{ data: EvaluacionPeriodo[]; total: number }> {
    return await this.repository.findAll(filters);
  }
}

@Injectable()
export class GetEvaluacionPeriodoByIdUseCase {
  constructor(
    @Inject(EVALUACIONPERIODO_REPOSITORY)
    private readonly repository: IEvaluacionPeriodoRepository,
  ) {}

  async execute(id: string): Promise<EvaluacionPeriodo> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new Error('EvaluacionPeriodo no encontrado');
    return entity;
  }
}
