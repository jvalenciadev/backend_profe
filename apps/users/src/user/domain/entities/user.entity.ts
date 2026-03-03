export class User {
    id: string;
    nombre: string;
    apellidos: string;
    username: string;
    correo: string;
    celular?: string | null;
    imagen?: string | null;
    estado: string;
    tenantId?: string | null;
    requiresPasswordChange: boolean | null;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    roles?: any[];
    sedes?: any[];
    tenant?: any;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
