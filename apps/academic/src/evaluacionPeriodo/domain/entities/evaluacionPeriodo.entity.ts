export class EvaluacionPeriodo {
  constructor(
    public id: string,
    public periodo: string,
    public gestion: string,
    public semestre: string,
    public activo: boolean,
    public estado: string,
  ) {}
}
