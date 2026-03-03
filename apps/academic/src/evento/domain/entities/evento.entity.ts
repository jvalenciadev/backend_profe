export class Evento {
    constructor(
        public id: string,
        public titulo: string,
        public descripcion: string | null,
        public fecha: Date | null,
        public tipoId: string | null,
        public tenantId: string | null,
        public estado: string,
        public tipo?: any,
        public tenant?: any,
    ) { }
}
