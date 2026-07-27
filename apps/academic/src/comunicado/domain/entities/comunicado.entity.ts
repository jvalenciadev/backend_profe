export class Comunicado {
  constructor(
    public id: string,
    public imagen: string,
    public nombre: string,
    public descripcion: string,
    public importancia: string,
    public estado: string,
    public tenantId?: string,
  ) { }
}
