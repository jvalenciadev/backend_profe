export class BancoProfesional {
  id: string;
  correo: string;
  username: string;
  nombre: string;
  apellidos: string;
  ci: string;
  rda?: string | null;
  hojaDeVidaPdf?: string | null;
  rdaPdf?: string | null;
  imagen?: string | null;
  resumenProfesional?: string | null;
  habilidades?: string | null;
  idiomas?: string | null;
  experienciaLaboral?: string | null;
  linkedinUrl?: string | null;
  direccion?: string | null;
  estadoCivil?: string | null;
  fechaNacimiento?: string | null;
  celular?: string | null;
  genero?: string | null;
  esMaestro: boolean;
  licUniversitaria?: string | null;
  licMescp?: string | null;
  tieneProduccion: boolean;
  estado: string;
  cargoPostulacionId?: string | null;
  tenantId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations (serialized)
  postgrados?: any[];
  produccionIntelectual?: any[];
  cargoPostulacion?: any;
  tenant?: any;

  constructor(partial: Partial<BancoProfesional>) {
    Object.assign(this, partial);

    // Safety check for BigInts (cast to any for TS)
    if (typeof (this as any).ci === 'bigint')
      this.ci = (this as any).ci.toString();
    if (typeof (this as any).rda === 'bigint')
      this.rda = (this as any).rda.toString();
  }
}
