import { Turno } from '../entities/turno.entity';

export const TURNO_REPOSITORY = 'TURNO_REPOSITORY';

export interface ITurnoRepository {
  findAll(filter?: any, ability?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
