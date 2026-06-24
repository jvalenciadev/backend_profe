import { Inscripcion } from '../entities/inscripcion.entity';

export const INSCRIPCION_REPOSITORY = 'INSCRIPCION_REPOSITORY';

export interface IInscripcionRepository {
  findById(id: string): Promise<Inscripcion | null>;
  findAll(filter?: any, user?: any): Promise<Inscripcion[]>;
  create(data: any): Promise<Inscripcion>;
  update(id: string, data: any): Promise<Inscripcion>;
  delete(id: string): Promise<void>;
  findByPersonaAndPrograma(
    personaId: string,
    programaId: string,
  ): Promise<Inscripcion | null>;
  checkTurnAvailability(
    programaId: string,
    turnoId: string,
  ): Promise<{ cupo: number; cupoPre: number } | null>;
  reserveCupo(programaId: string, turnoId: string): Promise<boolean>;
  updateBaucher(baucherId: string, data: any): Promise<void>;
  findBaucherById(baucherId: string): Promise<any | null>;
}
