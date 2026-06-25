import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CuestionarioService } from './cuestionario.service';

@Injectable()
export class CuestionarioAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly baseService: CuestionarioService
  ) { }

  async getInfo(cuestionarioId: string, userId: string) {
    const cue = await this.prisma.mod_cuestionario.findFirst({
      where: {
        OR: [
          { id: cuestionarioId },
          { actividadId: cuestionarioId }
        ]
      },
      include: { actividad: true }
    });

    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    const intentos = await this.prisma.mod_intento.findMany({
      where: { userId, cuestionarioId: cue.id },
      orderBy: { iniciadoEn: 'desc' },
      include: {
        respuestas: true
      }
    });

    const enProgreso = intentos.find(i => i.estado === 'en_progreso');

    return {
      cuestionario: {
        id: cue.id,
        titulo: cue.actividad?.titulo || 'Cuestionario',
        instrucciones: cue.actividad?.instrucciones || '',
        puntajeMaximo: cue.actividad?.puntajeMax || 100,
        duracionMinutos: cue.duracion,
        maxIntentos: cue.maxIntentos,
        mostrarNota: cue.mostrarNota,
        retroInmediata: cue.retroInmediata,
        soloMobile: cue.soloMobile,
        bloquearCopia: cue.bloquearCopia,
        aleatorizar: cue.aleatorizar,
        preguntasPorIntento: cue.randomCount || 'Todas'
      },
      estadoUsuario: {
        intentosRealizados: intentos.length,
        intentosRestantes: Math.max(0, cue.maxIntentos - intentos.length + (enProgreso ? 1 : 0)),
        intentoEnProgreso: enProgreso ? {
          id: enProgreso.id,
          iniciadoEn: enProgreso.iniciadoEn,
          tiempoRestanteMs: Math.max(0, cue.duracion * 60 * 1000 - (Date.now() - enProgreso.iniciadoEn.getTime()))
        } : null,
        mejorPuntaje: intentos.length > 0 ? Math.max(...intentos.map((i) => i.puntajeTotal || 0)) : 0
      }
    };
  }

  async iniciarIntento(cuestionarioId: string, userId: string) {
    const cue = await this.prisma.mod_cuestionario.findFirst({
      where: {
        OR: [
          { id: cuestionarioId },
          { actividadId: cuestionarioId }
        ]
      },
      include: {
        preguntas: {
          where: { estado: 'activo' },
          include: {
            opciones: true
          }
        }
      },
    });

    if (!cue) throw new NotFoundException('Cuestionario no encontrado');

    if (cue.soloMobile) {
      // NOTE: User agent checking normally happens in the controller, 
      // but the mobile app will just enforce this logic naturally or via headers.
    }

    const intentosPrevios = await this.prisma.mod_intento.count({
      where: { userId, cuestionarioId: cue.id },
    });

    let intentoSeleccionado = await this.prisma.mod_intento.findFirst({
      where: { userId, cuestionarioId: cue.id, estado: 'en_progreso' },
      include: { respuestas: true },
    });

    if (!intentoSeleccionado) {
      if (intentosPrevios >= cue.maxIntentos) {
        throw new UnauthorizedException('Has alcanzado el máximo de intentos permitidos');
      }

      let preguntasSeleccionadas = cue.preguntas;

      if (cue.aleatorizar) {
        const shuffled = [...preguntasSeleccionadas];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        if (cue.randomCount && cue.randomCount > 0 && cue.randomCount < shuffled.length) {
          preguntasSeleccionadas = shuffled.slice(0, cue.randomCount);
        } else {
          preguntasSeleccionadas = shuffled;
        }
      }

      intentoSeleccionado = await this.prisma.mod_intento.create({
        data: {
          userId,
          cuestionarioId: cue.id,
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
    }

    // MAPEAR PREGUNTAS QUEMANDO EL "esCorrecta" PARA EVITAR HACKEOS DEL LADO CLIENTE
    const preguntasIdInIntento = intentoSeleccionado.respuestas.map(r => r.preguntaId);

    const preguntasDisponibles = cue.preguntas
      .filter(p => preguntasIdInIntento.includes(p.id))
      .map(p => {
        // Find existing response text or option if the user reconnects and resumes
        const respuestaDada = intentoSeleccionado.respuestas.find(r => r.preguntaId === p.id);

        return {
          id: p.id,
          texto: p.texto,
          tipo: p.tipo,
          puntaje: p.puntaje,
          imagen: p.imagen,
          orden: p.orden,
          respuestaActual: respuestaDada ? {
            opcionId: respuestaDada.opcionId,
            textoLibre: respuestaDada.textoLibre
          } : null,
          opciones: (() => {
            const mapped = p.opciones.map(o => ({
              id: o.id,
              texto: o.texto,
              orden: o.orden,
              // SECURITY: No enviar esCorrecta al Flutter App para prevenir trampas
            }));
            // Algoritmo Fisher-Yates para mezclar aleatoriamente las opciones
            for (let i = mapped.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
            }
            return mapped;
          })()
        };
      });

    return {
      intento: {
        id: intentoSeleccionado.id,
        iniciadoEn: intentoSeleccionado.iniciadoEn,
        numero: intentoSeleccionado.numero,
        duracionMinutos: cue.duracion
      },
      preguntas: preguntasDisponibles
    };
  }

  async guardarProgreso(intentoId: string, userId: string, data: { preguntaId: string, opcionId?: string, textoLibre?: string }[]) {
    const intento = await this.prisma.mod_intento.findUnique({
      where: { id: intentoId }
    });

    if (!intento || intento.userId !== userId || intento.estado !== 'en_progreso') {
      throw new UnauthorizedException('Intento finalizado o no válido');
    }

    const updates = data.map(d => this.baseService.resolverRespuesta(intentoId, d));
    await Promise.all(updates);

    return { success: true };
  }

  async finalizarIntento(intentoId: string, userId: string, motivoBloqueo?: string) {
    const intentoCheck = await this.prisma.mod_intento.findUnique({
      where: { id: intentoId },
      include: {
        cuestionario: true
      }
    });

    if (!intentoCheck || intentoCheck.userId !== userId) {
      throw new UnauthorizedException('Intento no encontrado o no autorizado');
    }

    if (motivoBloqueo) {
      await (this.prisma.mod_intento as any).update({
        where: { id: intentoId },
        data: { motivoBloqueo }
      });
    }

    // Usar la lógica de base que ya califica y guarda el intento
    const finalizado = await this.baseService.finalizarIntento(intentoId);

    if (!finalizado) throw new NotFoundException('No se pudo finalizar el intento');

    // Devolvemos el resultado dependiente de las opciones (mostrarNota, retroInmediata)
    const result: any = {
      intentoId,
      estado: finalizado.estado,
      motivoBloqueo: motivoBloqueo || (finalizado as any).motivoBloqueo || '',
    };

    if (intentoCheck.cuestionario.mostrarNota) {
      result.puntajeTotalObtenido = finalizado.puntajeTotal; // This could be mapped

      const notaFinalInRegistro = await this.prisma.mod_nota_actividad.findUnique({
        where: {
          actividadId_userId: {
            actividadId: intentoCheck.cuestionario.actividadId,
            userId: userId
          }
        }
      });
      result.notaFinalMapeada = notaFinalInRegistro?.nota || finalizado.puntajeTotal;
    }

    if (intentoCheck.cuestionario.retroInmediata) {
      // Necesitamos las opciones para mapear correctamente
      const cuestionarioCompleto = await this.prisma.mod_cuestionario.findUnique({
        where: { id: intentoCheck.cuestionario.id },
        include: { preguntas: { include: { opciones: true } } }
      });

      // Mapear respuestas con resultados
      result.retroalimentacion = finalizado.respuestas.map((r: any) => {
        const prep = cuestionarioCompleto?.preguntas.find((p: any) => p.id === r.preguntaId);
        return {
          preguntaId: r.preguntaId,
          preguntaTexto: prep?.texto,
          esCorrecta: r.esCorrecta,
          puntajeObtenido: r.puntaje,
          respuestaDada: {
            opcionId: r.opcionId,
            textoLibre: r.textoLibre
          },
          opciones: prep?.opciones.map((o: any) => ({
            id: o.id,
            texto: o.texto,
            esCorrecta: o.esCorrecta // Ahora si enviamos cual era correcta para la retroalimentación
          }))
        };
      });
    }

    return result;
  }
}
