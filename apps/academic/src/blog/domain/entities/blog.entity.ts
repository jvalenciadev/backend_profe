export class Blog {
  constructor(
    public id: string,
    public titulo: string,
    public descripcion: string | null,
    public fecha: Date | null,
    public imagenes: any | null,
    public tipo: string | null,
    public tenantId: string | null,
    public estado: string,
    public createdAt: Date,
    public updatedAt: Date,
    public createdBy: string | null,
    public updatedBy: string | null,
    public deletedBy: string | null,
    public tenant?: any,
  ) {}
}
