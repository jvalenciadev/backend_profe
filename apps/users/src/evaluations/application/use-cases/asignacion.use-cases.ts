import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import type {
  IEvaluacionRepository,
  CreateAsignacionData,
} from '../../domain/repositories/evaluacion.repository.interface';
import { EvaluacionAdmin } from '../../domain/entities/evaluacion.entity';

@Injectable()
export class CreateAsignacionUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(data: CreateAsignacionData): Promise<EvaluacionAdmin> {
    if (!data.evaluadorId) throw new BadRequestException('El evaluadorId es obligatorio');
    if (!data.evaluadoId) throw new BadRequestException('El evaluadoId es obligatorio');
    if (!data.periodoId) throw new BadRequestException('El periodoId es obligatorio');

    return this.repository.createAsignacion(data);
  }
}

@Injectable()
export class CreateAsignacionesMasivasUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(asignaciones: CreateAsignacionData[]): Promise<{ creadas: number }> {
    if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
      throw new BadRequestException('Debe proporcionar un arreglo con asignaciones');
    }
    const creadas = await this.repository.createAsignacionesMasivas(asignaciones);
    return { creadas };
  }
}

@Injectable()
export class GetAsignacionesByEvaluadorUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(evaluadorId: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    return this.repository.findAsignacionesByEvaluador(evaluadorId, periodoId);
  }
}

@Injectable()
export class GetAsignacionesByEvaluadoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(evaluadoId: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    return this.repository.findAsignacionesByEvaluado(evaluadoId, periodoId);
  }
}

@Injectable()
export class GetAsignacionByIdUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<EvaluacionAdmin> {
    const asignacion = await this.repository.findAsignacionById(id);
    if (!asignacion) throw new NotFoundException('Asignación de evaluación no encontrada');
    return asignacion;
  }
}

@Injectable()
export class GetAllAsignacionesUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]> {
    return this.repository.findAllAsignaciones(tenantId, periodoId);
  }
}

@Injectable()
export class DeleteAsignacionUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteAsignacion(id);
  }
}
