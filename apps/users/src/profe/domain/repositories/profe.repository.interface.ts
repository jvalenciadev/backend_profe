import { Profe } from '../entities/profe.entity';

export const PROFE_REPOSITORY = 'PROFE_REPOSITORY';

export interface ProfeFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface IProfeRepository {
  create(data: Omit<Profe, 'id'>): Promise<Profe>;
  findById(id: string): Promise<Profe | null>;
  findAll(filters?: ProfeFilters): Promise<{ data: Profe[]; total: number }>;
  update(id: string, data: Partial<Profe>): Promise<Profe>;
  delete(id: string): Promise<boolean>;
}
