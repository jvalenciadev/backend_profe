export class Oferta {
    id: string;
    nombre: string;
    codigo?: string | null;
    costo: number;
    cargaHoraria: number;
    fechaInicioInscripcion: Date;
    fechaFinInscripcion: Date;
    fechaInicioClases: Date;
    estadoInscripcion: boolean;
    estado: string;
    sedeId?: string | null;
    programaId?: string | null;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    programa?: any;
    sede?: any;
    turnos?: any[];

    constructor(partial: Partial<Oferta>) {
        Object.assign(this, partial);
    }

    isEnrollmentOpen(): boolean {
        const now = new Date();
        return this.estadoInscripcion &&
            now >= this.fechaInicioInscripcion &&
            now <= this.fechaFinInscripcion;
    }
}
