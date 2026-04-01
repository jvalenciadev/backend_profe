import { Calificacion } from '../entities/calificacion.entity';

export const CALIFICACION_REPOSITORY = 'CALIFICACION_REPOSITORY';

export interface ICalificacionRepository {
  findAll(filter?: any, ability?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
