export class UnidadEducativa {
  constructor(
    public id: string,
    public codigo: number,
    public nombre: string,
    public estado: string,
    public distritoId?: string,
  ) {}
}
