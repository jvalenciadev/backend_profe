import { BancoProfesional } from '../entities/banco-profesional.entity';

export const BANCO_PROFESIONAL_REPOSITORY = 'BANCO_PROFESIONAL_REPOSITORY';

export interface IBancoProfesionalRepository {
    findById(id: string): Promise<BancoProfesional | null>;
    findAll(filter?: any): Promise<BancoProfesional[]>;
    update(id: string, data: Partial<BancoProfesional>): Promise<BancoProfesional>;
    delete(id: string): Promise<void>;
    findByEmailOrUsername(email: string, username: string): Promise<BancoProfesional | null>;
    create(data: any): Promise<BancoProfesional>;

    // Posgrados
    addPosgrado(data: any): Promise<any>;
    updatePosgrado(id: string, data: any): Promise<any>;
    deletePosgrado(id: string): Promise<void>;

    // Producción
    addProduccion(data: any): Promise<any>;
    updateProduccion(id: string, data: any): Promise<any>;
    deleteProduccion(id: string): Promise<void>;
}
