import { Distrito } from '../entities/distrito.entity';

export const DISTRITO_REPOSITORY = 'DISTRITO_REPOSITORY';

export interface DistritoFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface IDistritoRepository {
  create(data: Omit<Distrito, 'id'>): Promise<Distrito>;
  findById(id: string): Promise<Distrito | null>;
  findAll(
    filters?: DistritoFilters,
  ): Promise<{ data: Distrito[]; total: number }>;
  update(id: string, data: Partial<Distrito>): Promise<Distrito>;
  delete(id: string): Promise<boolean>;
}
