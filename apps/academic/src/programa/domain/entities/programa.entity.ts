export class Programa {
  constructor(
    public id: string,
    public nombre: string,
    public codigo: string,
    public fechaInicioInscripcion: Date,
    public fechaFinInscripcion: Date,
    public fechaInicioClases: Date,
    public estado: string,
    public nombreAbreviado?: string,
    public contenido?: string,
    public horario?: string,
    public cargaHoraria?: number,
    public costo?: number,
    public banner?: string,
    public afiche?: string,
    public convocatoria?: string,
    public duracionId?: string,
    public tipoId?: string,
    public modalidadId?: string,
    public modulos?: any[],
  ) { }
}
