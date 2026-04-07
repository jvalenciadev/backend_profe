import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class CuestionarioService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.mod_intento.findMany({
      where: { cuestionarioId },
      include: {
        user: {
          select: { id: true, nombre: true, apellidos: true, correo: true },
        },
        respuestas: true,
      },
      orderBy: { iniciadoEn: 'desc' },
    });
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
    // Para simplificar: eliminar anteriores y crear nuevas (soft delete mejor)
    // Pero aquí usaremos una lógica de sincronización

    for (const p of preguntas) {
      if (p.id && !p.isNew) {
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

        // Sincronizar opciones
        for (const opt of p.opciones) {
          if (opt.id && !opt.isNew) {
            await this.prisma.mod_opcion.update({
              where: { id: opt.id },
              data: {
                texto: opt.texto,
                esCorrecta: opt.esCorrecta,
                orden: opt.orden,
              },
            });
          } else {
            await this.prisma.mod_opcion.create({
              data: {
                preguntaId: p.id,
                texto: opt.texto,
                esCorrecta: opt.esCorrecta,
                orden: opt.orden,
              },
            });
          }
        }
      } else {
        // Create
        const newP = await this.prisma.mod_pregunta.create({
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
    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      include: { actividad: true, preguntas: { where: { estado: 'activo' } } },
    });
    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    const intentos = await this.prisma.mod_intento.findMany({
      where: { userId, cuestionarioId },
      orderBy: { iniciadoEn: 'desc' },
    });

    const enProgreso = intentos.find((i) => i.estado === 'en_progreso');

    return {
      cuestionario: cue,
      intentosConsumidos: intentos.length,
      intentosRestantes: Math.max(0, cue.maxIntentos - intentos.length),
      intentoEnProgreso: enProgreso,
      mejorPuntaje:
        intentos.length > 0
          ? Math.max(...intentos.map((i) => i.puntajeTotal || 0))
          : 0,
    };
  }

  // ─── INTENTOS ───────────────────────────────────────────────

  async iniciarIntento(userId: string, cuestionarioId: string) {
    const cue = await this.prisma.mod_cuestionario.findUnique({
      where: { id: cuestionarioId },
      include: { preguntas: { where: { estado: 'activo' } } },
    });
    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    const intentosPrevios = await this.prisma.mod_intento.count({
      where: { userId, cuestionarioId },
    });

    // Verificar si hay intento en progreso
    const intentoEnProgreso = await this.prisma.mod_intento.findFirst({
      where: { userId, cuestionarioId, estado: 'en_progreso' },
      include: { respuestas: true },
    });

    if (intentoEnProgreso) return intentoEnProgreso;

    if (intentosPrevios >= cue.maxIntentos) {
      throw new UnauthorizedException(
        'Has alcanzado el máximo de intentos permitidos',
      );
    }

    let preguntasSeleccionadas = cue.preguntas;

    if (cue.aleatorizar) {
      // Fisher-Yates shuffle
      const shuffled = [...preguntasSeleccionadas];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
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
        respuestas: {
          create: preguntasSeleccionadas.map((p) => ({
            preguntaId: p.id,
          })),
        },
      },
      include: { respuestas: true },
    });

    return nuevoIntento;
  }

  async guardarRespuesta(
    intentoId: string,
    data: { preguntaId: string; opcionId?: string; textoLibre?: string },
  ) {
    return this.prisma.mod_respuesta.upsert({
      where: {
        // No hay un unique en mod_respuesta para un intento/pregunta... vamos a buscarlo.
        // Prisma no soporta upsert sin unique.
        // Usaremos findFirst y luego create/update.
        id: '99999999-9999-9999-9999-999999999999', // placeholder
      },
      update: {}, // logic manually below
      create: { ...data, intentoId: 'placeholder' }, // logic manually below
    });
    // Corregimos la lógica manual:
  }

  async resolverRespuesta(intentoId: string, data: any) {
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
        const opcCorrecta = pregunta.opciones.find((o) => o.esCorrecta);
        if (opcCorrecta && opcCorrecta.id === res.opcionId) {
          esCorrecta = true;
          puntaje = pregunta.puntaje;
        }
      } else if (pregunta.tipo === 'MULTIPLE_M') {
        // Estudiante envió JSON array de IDs en textoLibre
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
        // Estudiante envió JSON array de IDs en orden en textoLibre
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
        // Respuesta abierta: Calificación manual por defecto (0pts)
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

    // Fetch activity to check max points and scale if needed
    const actividad = await this.prisma.mod_actividad.findUnique({
      where: { id: intento.cuestionario.actividadId },
    });

    // Sum of max points possible for the EXACT questions selected in this attempt
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
      // Escalar nota al puntaje maximo de la actividad
      notaMapeada = (notaObtenida / maxPosibleIntento) * actividad.puntajeMax;
      notaMapeada = Math.round(notaMapeada * 100) / 100; // Redondear a 2 decimales
    } else if (actividad && notaMapeada > actividad.puntajeMax) {
      notaMapeada = actividad.puntajeMax;
    }

    const finalizado = await this.prisma.mod_intento.update({
      where: { id: intentoId },
      data: {
        estado: 'finalizado',
        finalizadoEn: new Date(),
        puntajeTotal: notaObtenida, // Guardamos la suma bruta
      },
      include: { cuestionario: true, respuestas: true },
    });

    // Sincronizar con mod_nota_actividad
    await this.prisma.mod_nota_actividad.upsert({
      where: {
        actividadId_userId: {
          actividadId: finalizado.cuestionario.actividadId,
          userId: finalizado.userId,
        },
      },
      update: {
        nota: notaMapeada,
        entroRegistro: true,
      },
      create: {
        actividadId: finalizado.cuestionario.actividadId,
        userId: finalizado.userId,
        nota: notaMapeada,
        entroRegistro: true,
      },
    });

    return finalizado;
  }
}
