import { EventoCuestionario } from '../entities/evento-cuestionario.entity';

export const EVENTOCUESTIONARIO_REPOSITORY = 'EVENTOCUESTIONARIO_REPOSITORY';

export interface IEventoCuestionarioRepository {
  findAll(filter?: any, ability?: any): Promise<any[]>;
  findById(id: string, ability?: any): Promise<any | null>;
  findProgressForPersona(eventoId: string, personaId: string): Promise<any[]>;
  create(data: any, userId?: string, forcedTenantId?: string): Promise<any>;
  update(id: string, data: any, userId?: string, ability?: any): Promise<any>;
  delete(id: string, userId?: string, ability?: any): Promise<void>;
}
