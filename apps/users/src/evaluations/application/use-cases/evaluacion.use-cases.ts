import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import type {
  IEvaluacionRepository,
  IniciarIntentoData,
  ResponderIntentoData,
} from '../../domain/repositories/evaluacion.repository.interface';
import {
  EvaluacionAdmin,
  EvaluacionIntento,
} from '../../domain/entities/evaluacion.entity';

@Injectable()
export class IniciarIntentoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(data: IniciarIntentoData): Promise<EvaluacionIntento> {
    if (!data.evaluacionAdminId) {
      throw new BadRequestException('El ID de asignación (evaluacionAdminId) es obligatorio');
    }
    return this.repository.iniciarIntento(data);
  }
}

@Injectable()
export class ResponderIntentoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(data: ResponderIntentoData): Promise<{
    intento: EvaluacionIntento;
    puntajeCalculado: number;
    asignacionActualizada: EvaluacionAdmin;
  }> {
    if (!data.intentoId) {
      throw new BadRequestException('El ID del intento es obligatorio');
    }
    if (!Array.isArray(data.respuestas) || data.respuestas.length === 0) {
      throw new BadRequestException('Debe incluir al menos una respuesta');
    }

    return this.repository.guardarRespuestasYCalcular(data);
  }
}

@Injectable()
export class GetIntentoByIdUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(id: string): Promise<EvaluacionIntento> {
    const intento = await this.repository.findIntentoById(id);
    if (!intento) throw new NotFoundException('Intento de evaluación no encontrado');
    return intento;
  }
}

@Injectable()
export class GetConsolidadoEvaluadoUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(evaluadoId: string, periodoId: string) {
    if (!evaluadoId || !periodoId) {
      throw new BadRequestException('evaluadoId y periodoId son obligatorios');
    }
    return this.repository.getConsolidadoEvaluado(evaluadoId, periodoId);
  }
}

@Injectable()
export class VerifyEvaluacionCodeUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(code: string): Promise<EvaluacionAdmin> {
    const evaluacion = await this.repository.findByVerificationCode(code);
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada o código inválido');
    return evaluacion;
  }
}

@Injectable()
export class GetUsersToEvaluateUseCase {
  constructor(
    @Inject(EVALUACION_REPOSITORY)
    private readonly repository: IEvaluacionRepository,
  ) {}

  async execute(tenantId?: string, periodoId?: string): Promise<any[]> {
    return this.repository.findUsersToEvaluate(tenantId, periodoId);
  }
}
