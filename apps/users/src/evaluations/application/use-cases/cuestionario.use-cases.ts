import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import type {
  IEvaluacionRepository,
  CreateCuestionarioData,
} from '../../domain/repositories/evaluacion.repository.interface';
import { EvaluacionCuestionario } from '../../domain/entities/evaluacion.entity';

@Injectable()
export class CreateCuestionarioUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(data: CreateCuestionarioData): Promise<EvaluacionCuestionario> {
    if (!data.titulo || data.titulo.trim().length === 0) {
      throw new BadRequestException('El título del cuestionario es obligatorio');
    }
    if (!data.periodoId) {
      throw new BadRequestException('El periodoId es obligatorio');
    }

    return this.repository.createCuestionario(data);
  }
}

@Injectable()
export class GetCuestionariosUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(periodoId?: string): Promise<EvaluacionCuestionario[]> {
    return this.repository.findAllCuestionarios(periodoId);
  }
}

@Injectable()
export class GetCuestionarioByIdUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<EvaluacionCuestionario> {
    const cuest = await this.repository.findCuestionarioById(id);
    if (!cuest) throw new NotFoundException('Cuestionario no encontrado');
    return cuest;
  }
}

@Injectable()
export class GetCuestionariosByCargoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(cargoId: string, periodoId?: string): Promise<EvaluacionCuestionario[]> {
    return this.repository.findCuestionariosByCargo(cargoId, periodoId);
  }
}

@Injectable()
export class UpdateCuestionarioUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string, data: Partial<CreateCuestionarioData>): Promise<EvaluacionCuestionario> {
    await this.repository.findCuestionarioById(id);
    return this.repository.updateCuestionario(id, data);
  }
}

@Injectable()
export class DeleteCuestionarioUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteCuestionario(id);
  }
}
