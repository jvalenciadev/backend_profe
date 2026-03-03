export class Cargo {
    constructor(
        public readonly id: string,
        public nombre: string,
        public estado: string,
        public createdAt?: Date,
        public updatedAt?: Date,
        public deletedAt?: Date | null,
        public createdBy?: string | null,
        public updatedBy?: string | null,
        public deletedBy?: string | null,
    ) { }

    // Aquí irían métodos ricos del dominio, por ejemplo:
    // inactivar() { this.estado = 'inactivo'; }
}
