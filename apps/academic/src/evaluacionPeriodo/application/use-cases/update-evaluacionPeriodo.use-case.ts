import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EVALUACIONPERIODO_REPOSITORY } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import type { IEvaluacionPeriodoRepository } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import { EvaluacionPeriodo } from '../../domain/entities/evaluacionPeriodo.entity';

@Injectable()
export class UpdateEvaluacionPeriodoUseCase {
  constructor(
    @Inject(EVALUACIONPERIODO_REPOSITORY)
    private readonly repository: IEvaluacionPeriodoRepository,
  ) {}

  async execute(id: string, data: Partial<EvaluacionPeriodo>): Promise<EvaluacionPeriodo> {
    return await this.repository.update(id, data);
  }
}

@Injectable()
export class DeleteEvaluacionPeriodoUseCase {
  constructor(
    @Inject(EVALUACIONPERIODO_REPOSITORY)
    private readonly repository: IEvaluacionPeriodoRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}
