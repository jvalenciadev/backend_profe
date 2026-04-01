import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import type { IEvaluacionRepository } from '../../domain/repositories/evaluacion.repository.interface';
import { EvaluacionPeriodo } from '../../domain/entities/evaluacion.entity';

@Injectable()
export class CreatePeriodoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(data: {
    gestion: string;
    semestre: string;
    periodo: string;
    criterios: { nombre: string; puntajeMaximo: number; orden?: number }[];
  }): Promise<EvaluacionPeriodo> {
    return this.repository.createPeriodo(data);
  }
}

@Injectable()
export class GetPeriodosUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(): Promise<EvaluacionPeriodo[]> {
    return this.repository.findAllPeriodos();
  }
}

@Injectable()
export class GetPeriodoByIdUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<EvaluacionPeriodo> {
    const periodo = await this.repository.findPeriodoById(id);
    if (!periodo) throw new NotFoundException('Período no encontrado');
    return periodo;
  }
}

@Injectable()
export class TogglePeriodoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string, activo: boolean): Promise<EvaluacionPeriodo> {
    const existing = await this.repository.findPeriodoById(id);
    if (!existing) throw new NotFoundException('Período no encontrado');
    return this.repository.togglePeriodo(id, activo);
  }
}

@Injectable()
export class DeletePeriodoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findPeriodoById(id);
    if (!existing) throw new NotFoundException('Período no encontrado');
    return this.repository.deletePeriodo(id);
  }
}
