import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CuestionarioService {
  constructor(private readonly prisma: PrismaService) { }

  async getCuestionario(id: string) {
    return this.prisma.mod_cuestionario.findUnique({
      where: { id },
      include: {
        actividad: true,
        preguntas: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
          include: {
            opciones: {
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });
  }

  async getCuestionarioByActividad(actividadId: string) {
    return this.prisma.mod_cuestionario.findUnique({
      where: { actividadId },
      include: {
        actividad: true,
        preguntas: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
          include: {
            opciones: {
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });
  }

  async getIntentosPorCuestionario(cuestionarioId: string) {
    // Auto-finalizar expirados antes de listar
    await this.autoFinalizarExpirados(cuestionarioId);

    return this.prisma.mod_intento.findMany({
      where: { cuestionarioId, estado: { not: 'eliminado' } },
      include: {
        user: {
          select: { id: true, nombre: true, apellidos: true, correo: true },
        },
        respuestas: true,
      },
      orderBy: { iniciadoEn: 'desc' },
    });
  }

  /**
   * Busca intentos en progreso que ya superaron su tiempo límite y los finaliza.
   */
  private async autoFinalizarExpirados(cuestionarioId: string) {
    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      select: { duracion: true },
    });

    if (!cue || cue.duracion === 0) return;

    const expirables = await this.prisma.mod_intento.findMany({
      where: { cuestionarioId, estado: 'en_progreso' },
    });

    for (const int of expirables) {
      const extraTime = int.motivoBloqueo === 'persona_discapacidad' ? 15 : 0;
      const totalMin = cue.duracion + extraTime;
      const limite = new Date(int.iniciadoEn.getTime() + totalMin * 60000);

      if (limite < new Date()) {
        try {
          await this.finalizarIntento(int.id);
        } catch (e) {
          console.error(`Error auto-finalizando intento ${int.id}:`, e);
        }
      }
    }
  }

  async updateCuestionario(id: string, data: any) {
    return this.prisma.mod_cuestionario.update({
      where: { id },
      data: {
        duracion: data.duracion,
        maxIntentos: data.maxIntentos,
        aleatorizar: data.aleatorizar,
        randomCount: data.randomCount !== undefined ? data.randomCount : null,
        mostrarNota: data.mostrarNota,
        retroInmediata: data.retroInmediata,
        soloMobile:
          data.soloMobile !== undefined
            ? data.soloMobile
            : data.mod_cue_solo_mobile,
        bloquearCopia:
          data.bloquearCopia !== undefined
            ? data.bloquearCopia
            : data.mod_cue_bloquear_copia,
      },
    });
  }

  async syncPreguntas(cuestionarioId: string, preguntas: any[]) {
    // 1. Obtener preguntas actuales ACTIVAS en la DB
    const currentDBPreguntas = await this.prisma.mod_pregunta.findMany({
      where: { cuestionarioId, estado: 'activo' },
      select: { id: true },
    });
    const currentDBIds = currentDBPreguntas.map((p) => p.id);
    const incomingIds = preguntas.map((p) => p.id).filter((id) => id && typeof id === 'string');

    // 2. Desactivar preguntas que NO vienen en el array (Soft Delete)
    const idsToDelete = currentDBIds.filter((id) => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await this.prisma.mod_pregunta.updateMany({
        where: { id: { in: idsToDelete } },
        data: { estado: 'eliminado' },
      });
    }

    // 3. Crear o actualizar preguntas y opciones
    for (const p of preguntas) {
      if (p.id && typeof p.id === 'string' && currentDBIds.includes(p.id)) {
        // Update
        await this.prisma.mod_pregunta.update({
          where: { id: p.id },
          data: {
            texto: p.texto,
            tipo: p.tipo,
            puntaje: p.puntaje,
            orden: p.orden,
            imagen: p.imagen,
          },
        });

        // Sync opciones
        if (p.opciones) {
          // Eliminar opciones viejas (Hard Delete es más simple aquí)
          await this.prisma.mod_opcion.deleteMany({
            where: { preguntaId: p.id },
          });
          // Crear nuevas
          if (p.opciones.length > 0) {
            await this.prisma.mod_opcion.createMany({
              data: p.opciones.map((o) => ({
                preguntaId: p.id,
                texto: o.texto,
                esCorrecta: o.esCorrecta,
                orden: o.orden,
              })),
            });
          }
        }
      } else {
        // Create
        await this.prisma.mod_pregunta.create({
          data: {
            cuestionarioId,
            texto: p.texto,
            tipo: p.tipo,
            puntaje: p.puntaje,
            orden: p.orden,
            imagen: p.imagen,
            opciones: {
              create: p.opciones.map((o) => ({
                texto: o.texto,
                esCorrecta: o.esCorrecta,
                orden: o.orden,
              })),
            },
          },
        });
      }
    }

    return { success: true };
  }

  async getLobbyData(userId: string, cuestionarioId: string) {
    // Auto-finalizar expirados para este cuestionario
    await this.autoFinalizarExpirados(cuestionarioId);

    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      include: { 
        actividad: true, 
        preguntas: { 
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' }
        } 
      },
    });
    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    const intentos = await this.prisma.mod_intento.findMany({
      where: { userId, cuestionarioId },
      orderBy: { iniciadoEn: 'desc' },
    });

    const enProgreso = intentos.find((i) => i.estado === 'en_progreso');

    return {
      cuestionario: cue,
      intentosConsumidos: intentos.filter((i) => i.estado !== 'eliminado').length,
      intentosRestantes: Math.max(
        0,
        cue.maxIntentos - intentos.filter((i) => i.estado !== 'eliminado').length,
      ),
      intentoEnProgreso: enProgreso,
      mejorPuntaje:
        intentos.filter((i) => i.estado !== 'eliminado').length > 0
          ? Math.max(
            ...intentos
              .filter((i) => i.estado !== 'eliminado')
              .map((i) => i.puntajeTotal || 0),
          )
          : 0,
    };
  }

  // ─── INTENTOS ───────────────────────────────────────────────

  async iniciarIntento(userId: string, cuestionarioId: string, config: any = {}) {
    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      include: {
        preguntas: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
          include: { opciones: { orderBy: { orden: 'asc' } } }
        }
      },
    });
    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    const intentosPrevios = await this.prisma.mod_intento.count({
      where: { userId, cuestionarioId, estado: { not: 'eliminado' } },
    });

    // Verificar si hay intento en progreso
    const intentoEnProgreso = await this.prisma.mod_intento.findFirst({
      where: { userId, cuestionarioId, estado: 'en_progreso' },
      include: { respuestas: { orderBy: { id: 'asc' } } },
    });

    if (intentoEnProgreso) {
      // Calcular tiempo restante en SERVIDOR para reconexión
      const extraTime = intentoEnProgreso.motivoBloqueo === 'persona_discapacidad' ? 900 : 0;
      const tiempoRestanteSegundos = cue.duracion > 0
        ? Math.max(0, (cue.duracion * 60 + extraTime) - Math.floor((Date.now() - intentoEnProgreso.iniciadoEn.getTime()) / 1000))
        : null;
      return { ...intentoEnProgreso, tiempoRestanteSegundos };
    }

    if (intentosPrevios >= cue.maxIntentos) {
      throw new UnauthorizedException(
        'Has alcanzado el máximo de intentos permitidos',
      );
    }

    // ─── VERIFICACIÓN DE FACILITADOR PARA DISCAPACIDAD ───────────
    if (config.discapacidad) {
      if (!config.password) {
        throw new UnauthorizedException('Se requiere la contraseña del facilitador para activar este modo');
      }

      const isAuthorized = await this.verificarFacilitadorPassword(cuestionarioId, config.password);
      if (!isAuthorized) {
        throw new UnauthorizedException('La contraseña del facilitador es incorrecta o no está autorizado para este módulo');
      }
    }

    let preguntasSeleccionadas = cue.preguntas;

    if (cue.aleatorizar) {
      // Fisher-Yates shuffle para preguntas
      const shuffled = [...preguntasSeleccionadas];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Mezclar también las opciones de cada pregunta para mayor seguridad
      shuffled.forEach((p: any) => {
        if (p.opciones && p.opciones.length > 0) {
          for (let i = p.opciones.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p.opciones[i], p.opciones[j]] = [p.opciones[j], p.opciones[i]];
          }
        }
      });

      if (
        cue.randomCount &&
        cue.randomCount > 0 &&
        cue.randomCount < shuffled.length
      ) {
        preguntasSeleccionadas = shuffled.slice(0, cue.randomCount);
      } else {
        preguntasSeleccionadas = shuffled;
      }
    }

    const nuevoIntento = await this.prisma.mod_intento.create({
      data: {
        userId,
        cuestionarioId,
        numero: intentosPrevios + 1,
        estado: 'en_progreso',
        motivoBloqueo: config.discapacidad ? 'persona_discapacidad' : null,
        respuestas: {
          create: preguntasSeleccionadas.map((p) => ({
            preguntaId: p.id,
          })),
        },
      },
      include: { respuestas: { orderBy: { id: 'asc' } } },
    });

    // Calcular tiempo restante en el SERVIDOR para evitar manipulación por reloj del cliente
    const extraTime = config.discapacidad ? 900 : 0;
    const tiempoRestanteSegundos = cue.duracion > 0
      ? Math.max(0, (cue.duracion * 60 + extraTime) - Math.floor((Date.now() - nuevoIntento.iniciadoEn.getTime()) / 1000))
      : null;

    return { ...nuevoIntento, tiempoRestanteSegundos };
  }

  async resolverRespuesta(
    intentoId: string,
    data: { preguntaId: string; opcionId?: string; textoLibre?: string },
  ) {
    const existing = await this.prisma.mod_respuesta.findFirst({
      where: { intentoId, preguntaId: data.preguntaId },
    });

    if (existing) {
      return this.prisma.mod_respuesta.update({
        where: { id: existing.id },
        data: {
          opcionId: data.opcionId,
          textoLibre: data.textoLibre,
        },
      });
    } else {
      return this.prisma.mod_respuesta.create({
        data: {
          intentoId,
          preguntaId: data.preguntaId,
          opcionId: data.opcionId,
          textoLibre: data.textoLibre,
        },
      });
    }
  }

  async finalizarIntento(intentoId: string) {
    const intento = await this.prisma.mod_intento.findUnique({
      where: { id: intentoId },
      include: {
        respuestas: true,
        cuestionario: {
          include: {
            preguntas: {
              where: { estado: 'activo' },
              include: { opciones: true },
            },
          },
        },
      },
    });

    if (!intento) throw new NotFoundException('Intento no encontrado');
    if (intento.estado === 'finalizado') return intento;

    // CALCULAR NOTA
    let notaObtenida = 0;
    const updates: any[] = [];

    for (const res of intento.respuestas) {
      const pregunta = intento.cuestionario.preguntas.find(
        (p) => p.id === res.preguntaId,
      );
      if (!pregunta) continue;

      let esCorrecta = false;
      let puntaje = 0;

      if (pregunta.tipo === 'MULTIPLE' || pregunta.tipo === 'VF') {
        const opcionCorrecta = pregunta.opciones.find((o) => o.esCorrecta);
        if (opcionCorrecta && res.opcionId === opcionCorrecta.id) {
          esCorrecta = true;
          puntaje = pregunta.puntaje;
        }
      } else if (pregunta.tipo === 'MULTIPLE_M') {
        try {
          const idsMarcados: string[] = JSON.parse(res.textoLibre || '[]');
          const idsCorrectos = pregunta.opciones
            .filter((o) => o.esCorrecta)
            .map((o) => o.id);
          const idsIncorrectos = pregunta.opciones
            .filter((o) => !o.esCorrecta)
            .map((o) => o.id);

          const marcoTodosCorrectos = idsCorrectos.every((id) =>
            idsMarcados.includes(id),
          );
          const noMarcoNingunIncorrecto = idsMarcados.every(
            (id) => !idsIncorrectos.includes(id),
          );

          if (
            marcoTodosCorrectos &&
            noMarcoNingunIncorrecto &&
            idsMarcados.length === idsCorrectos.length
          ) {
            esCorrecta = true;
            puntaje = pregunta.puntaje;
          }
        } catch (e) {
          console.error('Error parseando MULTIPLE_M:', e);
        }
      } else if (pregunta.tipo === 'ORDENAR') {
        try {
          const idsOrdenados: string[] = JSON.parse(res.textoLibre || '[]');
          const idsEnOrdenCorrecto = [...pregunta.opciones]
            .sort((a, b) => a.orden - b.orden)
            .map((o) => o.id);

          if (
            JSON.stringify(idsOrdenados) === JSON.stringify(idsEnOrdenCorrecto)
          ) {
            esCorrecta = true;
            puntaje = pregunta.puntaje;
          }
        } catch (e) {
          console.error('Error parseando ORDENAR:', e);
        }
      } else if (pregunta.tipo === 'TEXTO') {
        esCorrecta = false;
        puntaje = 0;
      }

      notaObtenida += puntaje;
      updates.push(
        this.prisma.mod_respuesta.update({
          where: { id: res.id },
          data: { esCorrecta, puntaje },
        }),
      );
    }

    await Promise.all(updates);

    const actividad = await this.prisma.mod_actividad.findUnique({
      where: { id: intento.cuestionario.actividadId },
    });

    const maxPosibleIntento = intento.respuestas.reduce((sum, res) => {
      const p = intento.cuestionario.preguntas.find(
        (pre) => pre.id === res.preguntaId,
      );
      return sum + (p?.puntaje || 0);
    }, 0);

    let notaMapeada = notaObtenida;
    if (
      actividad &&
      maxPosibleIntento > 0 &&
      maxPosibleIntento !== actividad.puntajeMax
    ) {
      notaMapeada = (notaObtenida * actividad.puntajeMax) / maxPosibleIntento;
    }

    const finalizado = await this.prisma.mod_intento.update({
      where: { id: intento.id },
      data: {
        estado: 'finalizado',
        finalizadoEn: new Date(),
        puntajeTotal: notaMapeada,
      },
      include: { respuestas: { orderBy: { id: 'asc' } } },
    });

    // Sincronizar la mejor nota del cuestionario con mod_nota_actividad
    try {
      const intentosUsuario = await this.prisma.mod_intento.findMany({
        where: {
          cuestionarioId: intento.cuestionarioId,
          userId: intento.userId,
          estado: 'finalizado',
        },
        select: { puntajeTotal: true },
      });

      const mejorNota = Math.max(
        notaMapeada,
        ...intentosUsuario.map((i) => i.puntajeTotal || 0),
      );

      await this.prisma.mod_nota_actividad.upsert({
        where: {
          actividadId_userId: {
            actividadId: intento.cuestionario.actividadId,
            userId: intento.userId,
          },
        },
        update: {
          nota: mejorNota,
        },
        create: {
          actividadId: intento.cuestionario.actividadId,
          userId: intento.userId,
          nota: mejorNota,
        },
      });
    } catch (error) {
      console.error('Error al sincronizar nota en mod_nota_actividad:', error);
    }

    return finalizado;
  }

  // ─── FACILITADOR: RESET DE INTENTOS ─────────────────────────

  async buscarIntentoPorCI(cuestionarioId: string, ci: string) {
    const searchConditions: any[] = [{ username: ci }];
    if (/^\\d+$/.test(ci)) {
      try {
        searchConditions.push({ ci: BigInt(ci) });
      } catch (e) { }
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: searchConditions,
        deletedAt: null,
      },
      orderBy: [
        { estado: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    if (!user) return [];

    return this.prisma.mod_intento.findMany({
      where: {
        cuestionarioId,
        userId: user.id,
        estado: { not: 'eliminado' },
      },
      include: {
        user: {
          select: { id: true, nombre: true, apellidos: true, correo: true, ci: true },
        },
      },
      orderBy: { iniciadoEn: 'desc' },
    });
  }

  async resetearIntento(intentoId: string, facilitadorId: string) {
    const intento = await this.prisma.mod_intento.findUnique({
      where: { id: intentoId },
      include: { user: true }
    });

    if (!intento) throw new NotFoundException('Intento no encontrado');

    await this.prisma.mod_intento.update({
      where: { id: intentoId },
      data: {
        estado: 'eliminado',
      },
    });

    // Registrar en log de auditoría
    await this.prisma.auditLog.create({
      data: {
        action: 'RESET_CUESTIONARIO',
        resource: 'mod_intento',
        resourceId: intentoId,
        userId: facilitadorId,
        details: {
          estudianteId: intento.userId,
          estudianteNombre: `${intento.user.nombre} ${intento.user.apellidos}`,
          cuestionarioId: intento.cuestionarioId,
          motivo: 'Fallo técnico o solicitud de facilitador',
          intentoOriginal: intento.numero,
          puntajePrevio: intento.puntajeTotal,
        },
      },
    });

    // Si había una nota en mod_nota_actividad, la quitamos
    await this.prisma.mod_nota_actividad.deleteMany({
      where: {
        actividadId: intento.cuestionarioId, // Error anterior: debía ser actividadId si lo tenemos, pero intento tiene cuestionarioId.
        userId: intento.userId,
      },
    });

    return { success: true, message: 'Intento reseteado correctamente' };
  }

  async verificarFacilitadorPassword(cuestionarioId: string, password: string): Promise<boolean> {
    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      include: {
        actividad: {
          include: {
            unidad: {
              select: { moduloId: true, moduloMaestroId: true }
            }
          }
        }
      }
    });

    if (!cue) return false;

    const moduloId = cue.actividad.unidad.moduloId;
    const moduloMaestroId = cue.actividad.unidad.moduloMaestroId;

    const facilitadores = await this.prisma.programaDosFacilitador.findMany({
      where: { OR: [{ moduloId }, { moduloId: moduloMaestroId }] },
      include: { facilitador: true }
    });

    for (const f of facilitadores) {
      if (f.facilitador && await bcrypt.compare(password, f.facilitador.password)) {
        return true;
      }
    }
    return false;
  }
}
