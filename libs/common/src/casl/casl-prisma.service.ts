import { Injectable } from '@nestjs/common';
import { accessibleBy } from '@casl/prisma';
import { AppAbility } from './casl-ability.factory';

@Injectable()
export class CaslPrismaService {
  /**
   * Genera un objeto 'where' de Prisma basado en las reglas dinámicas de CASL
   * @param ability La habilidad del usuario cargada desde la BD
   * @param action La acción a realizar (read, update, delete)
   * @param subject El modelo de Prisma sobre el que se aplica el filtro
   */
  getWhere(ability: AppAbility, action: string, subject: string) {
    try {
      const rules: any = accessibleBy(ability, action as any);
      const criteria = rules[subject] || rules.all || {};
      return this.cleanCriteria(criteria, subject);
    } catch (error) {
      return { id: { in: [] } };
    }
  }

  private cleanCriteria(criteria: any, subject: string): any {
    const depIdSubjects = [
      'Sede',
      'Distrito',
      'ProgramaDos',
      'EventoInscripcion',
    ];
    const tenantIdSubjects = [
      'User',
      'Blog',
      'Comunicado',
      'Evento',
      'ProgramaInscripcion',
      'Video',
      'AuditLog',
      'Inscripcion',
      'EvaluacionAdmins',
      'EvaluacionPuntaje',
    ];
    const globalSubjects = [
      'Departamento',
      'Programa',
      'ProgramaDuracion',
      'ProgramaTipo',
      'ProgramaModalidad',
      'ProgramaVersion',
      'ProgramaTurno',
      'ProgramaModulo',
      'ProgramaModuloDos',
      'ProgramaModuloVersion',
      'TipoEvento',
      'EventoTipo',
      'Persona',
      'MapPersona',
      'AreaTrabajo',
      'Genero',
      'Provincia',
      'UnidadEducativa',
      'ActaConclusion',
      'Profe',
      'ProgramaInscripcionEstado',
      'ProgramaBaucher',
      'ProgramaRestriccion',
      'CalificacionParticipante',
      'ProgramaCalificacion',
      'ProgramaTipoCalificacion',
      'EventoRestriccion',
      'EventoCuestionario',
      'EventoPregunta',
      'EventoOpciones',
      'EventoRespuestas',
      'Galeria',
      'AsignacionFacilitador',
      'AsignarFacilitador',
    ];

    const fieldsToRemove: string[] = [];
    const subj = subject.toLowerCase();

    if (globalSubjects.some((s) => s.toLowerCase() === subj)) {
      fieldsToRemove.push('tenantId', 'departamentoId');
    } else if (depIdSubjects.some((s) => s.toLowerCase() === subj)) {
      fieldsToRemove.push('tenantId');
    } else if (tenantIdSubjects.some((s) => s.toLowerCase() === subj)) {
      fieldsToRemove.push('departamentoId');
    } else {
      fieldsToRemove.push('tenantId', 'departamentoId');
    }

    return this.recursiveClean(criteria, fieldsToRemove);
  }

  private recursiveClean(obj: any, fieldsToRemove: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj))
      return obj.map((item) => this.recursiveClean(item, fieldsToRemove));

    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!fieldsToRemove.includes(key)) {
        newObj[key] = this.recursiveClean(value, fieldsToRemove);
      }
    }
    return newObj;
  }
}
