import { Evento } from '../entities/evento.entity';

export const EVENTO_REPOSITORY = 'EVENTO_REPOSITORY';

export interface IEventoRepository {
    findAll(filter?: any, ability?: any): Promise<Evento[]>;
    findById(id: string, ability?: any): Promise<Evento | null>;
    create(data: any, userId?: string): Promise<Evento>;
    update(id: string, data: any, userId?: string): Promise<Evento>;
    delete(id: string, userId?: string): Promise<void>;
}
