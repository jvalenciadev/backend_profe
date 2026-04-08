export class Inscripcion {
  id: string;
  personaId: string;
  programaId: string; // This corresponds to programaDos.id
  turnoId: string;
  sedeId: string;
  estadoInscripcionId: string;
  observacion?: string;
  estado: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  persona?: any;
  programa?: any;
  sede?: any;
  turno?: any;
  estadoInscripcion?: any;
  baucher?: any[];

  constructor(partial: Partial<Inscripcion>) {
    Object.assign(this, partial);
  }
}
