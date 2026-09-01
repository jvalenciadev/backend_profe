import {
  EvaluacionAdmin,
  EvaluacionPeriodo,
  EvaluacionCuestionario,
  EvaluacionIntento,
} from '../entities/evaluacion.entity';

export const EVALUACION_REPOSITORY = 'EVALUACION_REPOSITORY';

export interface CreatePeriodoData {
  gestion: string;
  semestre: string;
  periodo: string;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  criterios?: CreateCriterioData[];
}

export interface CreateOpcionData {
  id?: string;
  texto: string;
  esCorrecta: boolean;
  orden?: number;
}

export interface CreateIndicadorData {
  id?: string;
  codigo?: string;
  indicador: string;
  descripcion?: string;
  tipoPregunta?: 'LIKERT' | 'OPCION_UNICA' | 'SELECCION_MULTIPLE' | 'VERDADERO_FALSO';
  pesoPorcentaje?: number;
  orden?: number;
  opciones?: CreateOpcionData[];
}

export interface CreateCriterioData {
  id?: string;
  periodoId?: string;
  nombre: string;
  descripcion?: string;
  pesoPorcentaje?: number;
  orden?: number;
  cargoIds?: string[];
  subcriterios?: CreateIndicadorData[];
}

export interface CreateCuestionarioData {
  periodoId: string;
  criterioId?: string;
  titulo: string;
  descripcion?: string;
  tiempoLimiteMinutos?: number | null;
  maxIntentos?: number;
  tipoCalculo?: string;
  notaMinima?: number;
  maxPreguntas?: number | null;
  randomPreguntas?: boolean;
  estado?: string;
  cargoIds?: string[];
  criterios?: CreateCriterioData[];
  preguntas?: CreateIndicadorData[];
  createdBy?: string;
}

export interface CreateAsignacionData {
  periodoId: string;
  cuestionarioId?: string;
  evaluadorId: string;
  evaluadoId: string;
  cargoId?: string;
  tenantId?: string;
  tipoEvaluacion?: string;
  createdBy?: string;
}

export interface IniciarIntentoData {
  evaluacionAdminId: string;
  numeroIntento?: number;
}

export interface ResponderIntentoData {
  intentoId: string;
  respuestas: {
    subcriterioId: string;
    escalaTexto: 'SIEMPRE' | 'CASI_SIEMPRE' | 'ALGUNAS_VECES' | 'CASI_NUNCA' | 'NUNCA';
    puntaje: number;
    observacion?: string;
  }[];
  finalizar?: boolean;
}

export interface IEvaluacionRepository {
  // ── Períodos ──
  createPeriodo(data: CreatePeriodoData): Promise<EvaluacionPeriodo>;
  updatePeriodo(id: string, data: Partial<CreatePeriodoData>): Promise<EvaluacionPeriodo>;
  findAllPeriodos(): Promise<EvaluacionPeriodo[]>;
  findPeriodoById(id: string): Promise<EvaluacionPeriodo | null>;
  togglePeriodo(id: string, activo: boolean): Promise<EvaluacionPeriodo>;
  deletePeriodo(id: string): Promise<void>;

  // ── Cuestionarios y Criterios ──
  createCuestionario(data: CreateCuestionarioData): Promise<EvaluacionCuestionario>;
  updateCuestionario(id: string, data: Partial<CreateCuestionarioData>): Promise<EvaluacionCuestionario>;
  findCuestionarioById(id: string): Promise<EvaluacionCuestionario | null>;
  findAllCuestionarios(periodoId?: string): Promise<EvaluacionCuestionario[]>;
  findCuestionariosByCargo(cargoId: string, periodoId?: string): Promise<EvaluacionCuestionario[]>;
  deleteCuestionario(id: string): Promise<void>;

  // ── Asignaciones (Quién evalúa a quién) ──
  createAsignacion(data: CreateAsignacionData): Promise<EvaluacionAdmin>;
  createAsignacionesMasivas(data: CreateAsignacionData[]): Promise<number>;
  findAsignacionesByEvaluador(evaluadorId: string, periodoId?: string): Promise<EvaluacionAdmin[]>;
  findAsignacionesByEvaluado(evaluadoId: string, periodoId?: string): Promise<EvaluacionAdmin[]>;
  findAsignacionById(id: string): Promise<EvaluacionAdmin | null>;
  findAllAsignaciones(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]>;
  deleteAsignacion(id: string): Promise<void>;

  // ── Intentos y Respuestas ──
  iniciarIntento(data: IniciarIntentoData): Promise<EvaluacionIntento>;
  findIntentoById(id: string): Promise<EvaluacionIntento | null>;
  findIntentosByAsignacion(asignacionId: string): Promise<EvaluacionIntento[]>;
  guardarRespuestasYCalcular(data: ResponderIntentoData): Promise<{
    intento: EvaluacionIntento;
    puntajeCalculado: number;
    asignacionActualizada: EvaluacionAdmin;
  }>;

  // ── Verificación y PDF ──
  findByVerificationCode(code: string): Promise<EvaluacionAdmin | null>;
  findUsersToEvaluate(tenantId?: string, periodoId?: string): Promise<any[]>;
  getConsolidadoEvaluado(evaluadoId: string, periodoId: string): Promise<{
    evaluado: any;
    periodo: EvaluacionPeriodo;
    evaluaciones: EvaluacionAdmin[];
    promedioGlobal: number;
    totalEvaluadores: number;
  }>;
}
