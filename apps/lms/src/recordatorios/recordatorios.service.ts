import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/database';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { differenceInDays, differenceInHours, addDays } from 'date-fns';

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notiService: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCronReminders() {
    this.logger.log(
      'LMS: Verificando actividades pendientes para recordatorios...',
    );
    try {
      await this.checkActivityDeadlines();
    } catch (error) {
      this.logger.error('Error en el cron de recordatorios:', error);
    }
  }

  private async checkActivityDeadlines() {
    const now = new Date();
    const next7Days = addDays(now, 7);

    // Buscar actividades activas que venzan en la ventana de tiempo
    const actividades = await this.prisma.mod_actividad.findMany({
      where: {
        estado: 'activo',
        fechaFin: {
          gt: now,
          lt: next7Days,
        },
        esCalificable: true,
      },
      include: {
        unidad: true,
      },
    });

    for (const act of actividades) {
      const fechaFin = new Date(act.fechaFin);
      const diffDays = differenceInDays(fechaFin, now);
      const diffHrs = differenceInHours(fechaFin, now);

      let threshold = '';
      let msg = '';
      let label = '';

      // Definir criticidad
      if (diffHrs <= 1) {
        threshold = '1H';
        label = '¡URGENTE!';
        msg = `¡Peligro! Menos de una hora para que venza "${act.titulo}". Súbelo ahora mismo.`;
      } else if (diffDays < 1) {
        threshold = '1D';
        label = 'ALERTA';
        msg = `¡El tiempo vuela! Tu actividad "${act.titulo}" vence mañana. No lo dejes para el final.`;
      } else if (diffDays <= 5) {
        threshold = '5D';
        label = 'RECORDATORIO';
        msg = `Hola, no olvides que tienes pendiente "${act.titulo}". Tienes 5 días para brillar.`;
      }

      if (threshold) {
        await this.notifyPendingStudents(act, threshold, msg, label);
      }
    }
  }

  private async notifyPendingStudents(
    act: any,
    threshold: string,
    message: string,
    label: string,
  ) {
    const moduloId = act.unidad.moduloId;
    const moduloMaestroId = act.unidad.moduloMaestroId;

    let programIds: string[] = [];

    // Identificar el programa para buscar inscripciones
    if (moduloId) {
      const mod = await this.prisma.programaModuloDos.findUnique({
        where: { id: moduloId },
        select: { programaDosId: true },
      });
      if (mod) programIds = [mod.programaDosId];
    } else if (moduloMaestroId) {
      const modTra = await this.prisma.programaModulo.findUnique({
        where: { id: moduloMaestroId },
        include: { programa: { include: { programaDos: true } } },
      });
      if (modTra) {
        programIds = modTra.programa.programaDos.map((p) => p.id);
      }
    }

    if (programIds.length === 0) return;

    // Estudiantes del programa
    const inscripciones = await this.prisma.programaInscripcion.findMany({
      where: {
        programaId: { in: programIds },
        estado: { in: ['activo', 'aprobado'] },
      },
      select: { personaId: true },
    });

    const studentIds = Array.from(
      new Set(inscripciones.map((i) => i.personaId)),
    );

    for (const userId of studentIds) {
      // Control de duplicidad: un solo recordatorio por threshold por actividad
      const tag = `RECORDATORIO_${act.id}_${threshold}`;

      const existing = await this.prisma.mod_notificacion.findFirst({
        where: { userId, tipo: tag },
      });

      if (existing) continue;

      // Verificar si entregó
      const submitted = await this.hasSubmitted(act, userId);
      if (submitted) continue;

      // Construcción del enlace dinámico según el tipo
      const cursoId = moduloId || 'm'; // fallback si es master
      const linkRef =
        act.tipo === 'CUESTIONARIO'
          ? `/aula/curso/${cursoId}?openQuiz=${act.id}`
          : `/aula/curso/${cursoId}/actividad/${act.id}`;

      // Enviar
      await this.notiService.emit({
        userId,
        titulo: `${label}: Actividad Pendiente`,
        mensaje: message,
        tipo: tag,
        linkRef,
      });
    }
  }

  private async hasSubmitted(act: any, userId: string): Promise<boolean> {
    try {
      if (act.tipo === 'TAREA') {
        const entrega = await this.prisma.mod_entrega.findFirst({
          where: { tarea: { actividadId: act.id }, userId },
        });
        return !!entrega;
      }
      if (act.tipo === 'CUESTIONARIO') {
        const intento = await this.prisma.mod_intento.findFirst({
          where: {
            cuestionario: { actividadId: act.id },
            userId,
            estado: 'finalizado',
          },
        });
        return !!intento;
      }
      if (act.tipo === 'FORO') {
        const post = await this.prisma.mod_foro_post.findFirst({
          where: { foro: { actividadId: act.id }, userId },
        });
        return !!post;
      }
    } catch (e) {
      this.logger.error(
        `Error verificando entrega para ${act.id}/${userId}:`,
        e,
      );
    }
    return false;
  }
}
