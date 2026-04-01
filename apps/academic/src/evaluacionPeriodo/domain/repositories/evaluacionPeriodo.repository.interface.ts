import { EvaluacionPeriodo } from '../entities/evaluacionPeriodo.entity';

export const EVALUACIONPERIODO_REPOSITORY = 'EVALUACIONPERIODO_REPOSITORY';

export interface EvaluacionPeriodoFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface IEvaluacionPeriodoRepository {
  create(data: Omit<EvaluacionPeriodo, 'id'>): Promise<EvaluacionPeriodo>;
  findById(id: string): Promise<EvaluacionPeriodo | null>;
  findActiveOverlap(
    gestion: string,
    semestre: string,
  ): Promise<EvaluacionPeriodo | null>;
  findAll(
    filters?: EvaluacionPeriodoFilters,
  ): Promise<{ data: EvaluacionPeriodo[]; total: number }>;
  update(
    id: string,
    data: Partial<EvaluacionPeriodo>,
  ): Promise<EvaluacionPeriodo>;
  delete(id: string): Promise<boolean>;
}
