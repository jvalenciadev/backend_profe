import { Inscripcion } from '../entities/inscripcion.entity';

export const INSCRIPCION_REPOSITORY = 'INSCRIPCION_REPOSITORY';

export interface IInscripcionRepository {
    findById(id: string): Promise<Inscripcion | null>;
    findAll(filter?: any): Promise<Inscripcion[]>;
    create(data: any): Promise<Inscripcion>;
    findByPersonaAndPrograma(personaId: string, programaId: string): Promise<Inscripcion | null>;
    checkTurnAvailability(programaId: string, turnoId: string): Promise<{ cupo: number, cupoPre: number } | null>;
    reserveCupo(programaId: string, turnoId: string): Promise<boolean>;
}
