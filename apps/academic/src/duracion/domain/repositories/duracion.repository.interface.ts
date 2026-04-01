import { Duracion } from '../entities/duracion.entity';

export const DURACION_REPOSITORY = 'DURACION_REPOSITORY';

export interface IDuracionRepository {
  findAll(filter?: any, ability?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
