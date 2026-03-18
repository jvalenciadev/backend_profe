import { Sede } from '../entities/sede.entity';

export const SEDE_REPOSITORY = 'SEDE_REPOSITORY';

export interface SedeFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface ISedeRepository {
  create(data: Omit<Sede, 'id'>): Promise<Sede>;
  findById(id: string, ability?: any): Promise<Sede | null>;
  findAll(filters?: SedeFilters, ability?: any): Promise<{ data: Sede[]; total: number }>;
  update(id: string, data: Partial<Sede>): Promise<Sede>;
  delete(id: string): Promise<boolean>;
}
