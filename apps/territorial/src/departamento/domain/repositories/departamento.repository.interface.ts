import { Departamento } from '../entities/departamento.entity';

export const DEPARTAMENTO_REPOSITORY = 'DEPARTAMENTO_REPOSITORY';

export interface DepartamentoFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface IDepartamentoRepository {
  create(data: Omit<Departamento, 'id'>): Promise<Departamento>;
  findById(id: string): Promise<Departamento | null>;
  findAll(filters?: DepartamentoFilters): Promise<{ data: Departamento[]; total: number }>;
  update(id: string, data: Partial<Departamento>): Promise<Departamento>;
  delete(id: string): Promise<boolean>;
}
