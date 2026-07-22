import { Comunicado } from '../entities/comunicado.entity';

export const COMUNICADO_REPOSITORY = 'COMUNICADO_REPOSITORY';

export interface ComunicadoFilters {
  search?: string;
  estado?: string;
  tipo?: string;
  page?: number;
  limit?: number;
  tenantId?: string;
}

export interface IComunicadoRepository {
  create(data: Omit<Comunicado, 'id'>): Promise<Comunicado>;
  findById(id: string, ability?: any): Promise<Comunicado | null>;
  findAll(
    filters?: ComunicadoFilters,
    ability?: any,
  ): Promise<{ data: Comunicado[]; total: number }>;
  update(id: string, data: Partial<Comunicado>): Promise<Comunicado>;
  delete(id: string): Promise<boolean>;
}
