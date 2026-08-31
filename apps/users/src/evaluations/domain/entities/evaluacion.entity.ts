export const ESCALA_LIKERT_VALORES = {
  SIEMPRE: 100,
  CASI_SIEMPRE: 80,
  ALGUNAS_VECES: 60,
  CASI_NUNCA: 40,
  NUNCA: 20,
} as const;

export type EscalaLikertTexto = keyof typeof ESCALA_LIKERT_VALORES;

export type TipoPregunta = 'LIKERT' | 'OPCION_UNICA' | 'SELECCION_MULTIPLE' | 'VERDADERO_FALSO';

export class EvaluacionPeriodo {
  constructor(
    public id: string,
    public periodo: string,
    public gestion: string,
    public semestre: string,
    public fechaInicio: Date | null,
    public fechaFin: Date | null,
    public activo: boolean,
    public estado: string,
    public cuestionarios?: EvaluacionCuestionario[],
    public criterios?: EvaluacionCriterio[],
  ) { }
}

export class EvaluacionCuestionario {
  constructor(
    public id: string,
    public periodoId: string,
    public titulo: string,
    public descripcion: string | null,
    public tiempoLimiteMinutos: number | null,
    public maxIntentos: number,
    public tipoCalculo: string,
    public notaMinima: number,
    public estado: string,
    public criterioId?: string | null,
    public cargos?: EvaluacionCuestionarioCargo[],
    public criterio?: EvaluacionCriterio,
    public periodo?: EvaluacionPeriodo,
    public maxPreguntas?: number | null,
    public randomPreguntas?: boolean,
  ) { }
}

export class EvaluacionCuestionarioCargo {
  constructor(
    public id: string,
    public cuestionarioId: string,
    public cargoId: string,
    public cargo?: any,
  ) { }
}

export class EvaluacionCriterioCargo {
  constructor(
    public id: string,
    public criterioId: string,
    public cargoId: string,
    public cargo?: any,
  ) { }
}

export class EvaluacionCriterio {
  constructor(
    public id: string,
    public periodoId: string | null,
    public nombre: string,
    public descripcion: string | null,
    public pesoPorcentaje: number,
    public orden: number,
    public estado: string,
    public cargos?: EvaluacionCriterioCargo[],
    public subcriterios?: EvaluacionSubcriterio[],
    public cuestionarios?: EvaluacionCuestionario[],
  ) { }
}

export class EvaluacionOpcion {
  constructor(
    public id: string,
    public subcriterioId: string,
    public texto: string,
    public esCorrecta: boolean,
    public orden: number,
  ) { }
}

export class EvaluacionSubcriterio {
  constructor(
    public id: string,
    public criterioId: string,
    public codigo: string | null,
    public indicador: string,
    public descripcion: string | null,
    public tipoPregunta: TipoPregunta,
    public pesoPorcentaje: number,
    public orden: number,
    public estado: string,
    public opciones?: EvaluacionOpcion[],
  ) { }
}

export class EvaluacionAdmin {
  constructor(
    public id: string,
    public periodoId: string,
    public cuestionarioId: string | null,
    public evaluadorId: string,
    public evaluadoId: string,
    public cargoId: string | null,
    public tenantId: string | null,
    public tipoEvaluacion: string,
    public estadoEvaluacion: string,
    public puntajeFinal: number | null,
    public codigoVerificacion: string | null,
    public qrCode: string | null,
    public observaciones: string | null,
    public estado: string,
    public evaluador?: any,
    public evaluado?: any,
    public cargo?: any,
    public cuestionario?: EvaluacionCuestionario,
    public periodo?: EvaluacionPeriodo,
    public intentos?: EvaluacionIntento[],
  ) { }
}

export class EvaluacionIntento {
  constructor(
    public id: string,
    public evaluacionAdminId: string,
    public numeroIntento: number,
    public fechaInicio: Date,
    public fechaFin: Date | null,
    public tiempoEmpleadoSegundos: number | null,
    public puntajeObtenido: number | null,
    public estado: string,
    public respuestas?: EvaluacionRespuesta[],
  ) { }
}

export class EvaluacionRespuesta {
  constructor(
    public id: string,
    public intentoId: string,
    public subcriterioId: string,
    public escalaTexto: string,
    public puntaje: number,
    public observacion: string | null,
    public subcriterio?: EvaluacionSubcriterio,
  ) { }
}
