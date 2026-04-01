import { Programa } from '../entities/programa.entity';

export const PROGRAMA_REPOSITORY = 'PROGRAMA_REPOSITORY';

export interface ProgramaFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface IProgramaRepository {
  create(data: Omit<Programa, 'id'>): Promise<Programa>;
  findById(id: string): Promise<Programa | null>;
  findAll(
    filters?: ProgramaFilters,
  ): Promise<{ data: Programa[]; total: number }>;
  update(id: string, data: Partial<Programa>): Promise<Programa>;
  delete(id: string): Promise<boolean>;
}
