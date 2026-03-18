import { Oferta } from '../entities/oferta.entity';

export const OFERTA_REPOSITORY = 'OFERTA_REPOSITORY';

export interface IOfertaRepository {
    findById(id: string, ability?: any): Promise<Oferta | null>;
    findAll(filter?: any, ability?: any): Promise<Oferta[]>;
    update(id: string, data: any): Promise<Oferta>;
    incrementCupoPreinscrito(ofertaId: string, turnoId: string): Promise<void>;
}
