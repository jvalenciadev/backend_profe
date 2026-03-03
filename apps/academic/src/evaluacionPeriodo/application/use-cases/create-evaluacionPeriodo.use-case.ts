import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EVALUACIONPERIODO_REPOSITORY } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import type { IEvaluacionPeriodoRepository } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import { EvaluacionPeriodo } from '../../domain/entities/evaluacionPeriodo.entity';

@Injectable()
export class CreateEvaluacionPeriodoUseCase {
  constructor(
    @Inject(EVALUACIONPERIODO_REPOSITORY)
    private readonly repository: IEvaluacionPeriodoRepository,
  ) { }

  async execute(data: any): Promise<EvaluacionPeriodo> {
    const { gestion, semestre } = data;

    if (!gestion || !semestre) {
      throw new BadRequestException('El periodo debe tener una gestión y semestre válidos.');
    }

    const overlap = await this.repository.findActiveOverlap(gestion, semestre);
    if (overlap) {
      throw new BadRequestException(`Ya existe un periodo de evaluación para la gestión ${gestion} y semestre ${semestre}.`);
    }

    // Basic business rule validation hook
    return await this.repository.create({ ...data, estado: data.estado || 'activo' });
  }
}
