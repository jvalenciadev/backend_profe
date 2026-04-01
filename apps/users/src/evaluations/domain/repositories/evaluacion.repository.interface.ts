import {
  EvaluacionAdmin,
  EvaluacionPeriodo,
} from '../entities/evaluacion.entity';

export const EVALUACION_REPOSITORY = 'EVALUACION_REPOSITORY';

export interface CreatePeriodoData {
  gestion: string;
  semestre: string;
  periodo: string;
  criterios: { nombre: string; puntajeMaximo: number; orden?: number }[];
}

export interface CreateEvaluacionData {
  userId: string;
  periodoId: string;
  tenantId: string | null;
  puntajes: { criterioId: string; puntaje: number }[];
  createdBy: string;
}

export interface IEvaluacionRepository {
  // Períodos
  createPeriodo(data: CreatePeriodoData): Promise<EvaluacionPeriodo>;
  findAllPeriodos(): Promise<EvaluacionPeriodo[]>;
  findPeriodoById(id: string): Promise<EvaluacionPeriodo | null>;
  togglePeriodo(id: string, activo: boolean): Promise<EvaluacionPeriodo>;
  deletePeriodo(id: string): Promise<void>;

  // Evaluaciones
  create(
    data: CreateEvaluacionData & {
      puntajeTotal: number;
      codigoVerificacion: string;
      qrCode: string;
      cargoId?: string | null;
    },
  ): Promise<EvaluacionAdmin>;
  findAll(tenantId?: string, periodoId?: string): Promise<EvaluacionAdmin[]>;
  findById(id: string): Promise<EvaluacionAdmin | null>;
  findByUser(userId: string): Promise<EvaluacionAdmin[]>;
  findByVerificationCode(code: string): Promise<EvaluacionAdmin | null>;
  existsActiveForUserInPeriodo(
    userId: string,
    periodoId: string,
  ): Promise<boolean>;

  // Usuarios para evaluar
  findUsersToEvaluate(tenantId?: string, periodoId?: string): Promise<any[]>;
}
