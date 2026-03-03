import { EventoPersona } from '../entities/evento-persona.entity';

export const EVENTOPERSONA_REPOSITORY = 'EVENTOPERSONA_REPOSITORY';

export interface IEventoPersonaRepository {
  findAll(filter?: any, ability?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}