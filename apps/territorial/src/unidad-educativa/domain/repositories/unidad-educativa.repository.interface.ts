import { UnidadEducativa } from '../entities/unidad-educativa.entity';

export const UNIDAD_EDUCATIVA_REPOSITORY = 'UNIDAD_EDUCATIVA_REPOSITORY';

export interface UnidadEducativaFilters {
  search?: string;
  estado?: string;
  distritoId?: string;
  page?: number;
  limit?: number;
}

export interface IUnidadEducativaRepository {
  create(data: Omit<UnidadEducativa, 'id'>): Promise<UnidadEducativa>;
  findById(id: string): Promise<UnidadEducativa | null>;
  findAll(
    filters?: UnidadEducativaFilters,
  ): Promise<{ data: UnidadEducativa[]; total: number }>;
  update(id: string, data: Partial<UnidadEducativa>): Promise<UnidadEducativa>;
  delete(id: string): Promise<boolean>;
}
