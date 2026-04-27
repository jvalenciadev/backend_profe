import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';

/**
 * CONTROLADOR DE VISTAS DE EVENTOS
 * Requiere API_SECRET (X-SECRET) pero no sesión de usuario.
 */
@Controller('public/eventos')
export class EventViewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':codigo')
  async getEvento(@Param('codigo') codigo: string) {
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        codigo,
      );
    const evento = await this.prisma.evento.findFirst({
      where: {
        OR: [{ codigo }, ...(isUuid ? [{ id: codigo }] : [])],
        estado: 'activo',
      },
      include: {
        tipo: true,
        tenant: true,
        camposExtras: {
          where: { deletedAt: null },
          orderBy: { orden: 'asc' },
        },
        cuestionarios: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
          include: {
            preguntas: {
              where: { estado: 'activo' },
              include: {
                opciones: { where: { estado: 'activo' } },
              },
            },
          },
        },
      },
    });

    if (!evento) throw new NotFoundException('Evento no encontrado');

    const sanitized = {
      ...evento,
      cuestionarios: evento.cuestionarios.map((c) => ({
        ...c,
        preguntas: c.preguntas.map((p) => ({
          ...p,
          opciones: p.opciones.map(({ esCorrecta: _, ...opt }) => opt),
        })),
      })),
    };

    return {
      ...sanitized,
      serverTime: new Date(),
    };
  }

  @Post('persona/buscar')
  async buscarPersona(@Body() body: { ci: string; fechaNacimiento: string }) {
    const { ci, fechaNacimiento } = body;
    if (!ci || !fechaNacimiento)
      throw new BadRequestException('CI y fecha de nacimiento requeridos');

    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(ci),
        fechaNacimiento: new Date(fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) return { found: false };

    return {
      found: true,
      persona: {
        ...persona,
        ci: persona.ci.toString(),
      },
    };
  }

  @Post(':eventoId/inscribir')
  async inscribirse(
    @Param('eventoId') eventoId: string,
    @Body()
    body: {
      ci: string;
      fechaNacimiento: string;
      complemento?: string;
      expedido?: string;
      nombre1: string;
      nombre2?: string;
      apellido1: string;
      apellido2?: string;
      correo: string;
      celular: string;
      generoId?: number;
      departamentoId: string;
      modalidadId: string;
      respuestasExtras?: Array<{ campoId: string; valor: any }>;
    },
  ) {
    const evento = await this.prisma.evento.findFirst({
      where: { id: eventoId, estado: 'activo' },
    });

    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (!evento.inscripcionAbierta)
      throw new ForbiddenException('La inscripción está cerrada');

    let persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) {
      persona = await this.prisma.eventoPersona.create({
        data: {
          ci: BigInt(body.ci),
          complemento: body.complemento || '',
          expedido: body.expedido || 'LP',
          nombre1: body.nombre1.toUpperCase(),
          nombre2: body.nombre2?.toUpperCase() || '',
          apellido1: body.apellido1.toUpperCase(),
          apellido2: body.apellido2?.toUpperCase() || '',
          fechaNacimiento: new Date(body.fechaNacimiento),
          correo: body.correo.toLowerCase(),
          celular: body.celular,
          generoId: BigInt(body.generoId || 1),
        },
      });
    } else {
      persona = await this.prisma.eventoPersona.update({
        where: { id: persona.id },
        data: {
          nombre1: body.nombre1.toUpperCase(),
          nombre2: body.nombre2?.toUpperCase() || persona.nombre2,
          apellido1: body.apellido1.toUpperCase(),
          apellido2: body.apellido2?.toUpperCase() || persona.apellido2,
          correo: body.correo.toLowerCase(),
          celular: body.celular,
        },
      });
    }

    const existente = await this.prisma.eventoInscripcion.findFirst({
      where: { personaId: persona.id, eventoId, deletedAt: null },
    });

    if (existente)
      throw new ConflictException('Ya estás inscrito en este evento');

    const inscripcion = await this.prisma.eventoInscripcion.create({
      data: {
        personaId: persona.id,
        eventoId,
        departamentoId: body.departamentoId,
        modalidadId: body.modalidadId,
        asistencia: false,
        estado: 'activo',
        respuestasExtras: {
          create:
            body.respuestasExtras?.map((re) => {
              let finalValue = re.valor;
              if (Array.isArray(re.valor)) {
                // Limpiar cada elemento de posibles comillas o corchetes accidentales (legacy)
                finalValue = re.valor
                  .map((v) =>
                    String(v)
                      .replace(/^["'\[\s]+|[\]"'\s]+$/g, '')
                      .trim(),
                  )
                  .filter((v) => v !== '')
                  .join(', ');
              } else if (typeof re.valor === 'boolean') {
                finalValue = re.valor ? 'SÍ' : 'NO';
              }
              return {
                campoExtraId: re.campoId,
                valor: String(finalValue),
              };
            }) || [],
        },
      },
    });

    await this.prisma.evento.update({
      where: { id: eventoId },
      data: { totalInscritos: { increment: 1 } },
    });

    return {
      success: true,
      inscripcion: { id: inscripcion.id },
      persona: { ...persona, ci: persona.ci.toString() },
      evento: {
        nombre: evento.nombre,
        fecha: evento.fecha,
        lugar: evento.lugar,
      },
    };
  }

  @Post(':eventoId/verificar-inscripcion')
  async verificarInscripcion(
    @Param('eventoId') eventoId: string,
    @Body() body: { ci: string; fechaNacimiento: string },
  ) {
    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) return { inscrito: false, message: 'No encontrado' };

    const inscripcion = await this.prisma.eventoInscripcion.findFirst({
      where: { personaId: persona.id, eventoId, deletedAt: null },
      include: { evento: true },
    });

    if (!inscripcion) return { inscrito: false };

    return {
      inscrito: true,
      inscripcion: { id: inscripcion.id, asistencia: inscripcion.asistencia },
      persona: { ...persona, ci: persona.ci.toString() },
    };
  }

  @Post(':eventoId/asistencia')
  async registrarAsistencia(
    @Param('eventoId') eventoId: string,
    @Body()
    body: { ci: string; fechaNacimiento: string; codigoAsistencia: string },
  ) {
    const evento = await this.prisma.evento.findFirst({
      where: { id: eventoId, estado: 'activo' },
    });

    if (!evento) throw new NotFoundException('Evento no encontrado');

    if (!evento.codigoAsistencia)
      throw new ForbiddenException(
        'Este evento no tiene código de asistencia activo',
      );

    if (
      evento.codigoAsistencia.trim().toUpperCase() !==
      body.codigoAsistencia.trim().toUpperCase()
    )
      throw new ForbiddenException('Código de asistencia incorrecto');

    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona)
      throw new NotFoundException('Participante no registrado en el evento');

    const inscripcion = await this.prisma.eventoInscripcion.findFirst({
      where: { personaId: persona.id, eventoId, deletedAt: null },
    });

    if (!inscripcion)
      throw new NotFoundException('No estás inscrito en este evento');

    if (inscripcion.asistencia) {
      return {
        success: true,
        yaRegistrada: true,
        persona: { ...persona, ci: persona.ci.toString() },
        evento: {
          nombre: evento.nombre,
          fecha: evento.fecha,
          lugar: evento.lugar,
        },
        inscripcion: inscripcion.id,
      };
    }

    await this.prisma.eventoInscripcion.update({
      where: { id: inscripcion.id },
      data: { asistencia: true },
    });

    return {
      success: true,
      yaRegistrada: false,
      persona: { ...persona, ci: persona.ci.toString() },
      evento: {
        nombre: evento.nombre,
        fecha: evento.fecha,
        lugar: evento.lugar,
      },
      inscripcion: inscripcion.id,
    };
  }

  @Post(':eventoId/cuestionario/:cuestionarioId/marcar-video')
  async marcarVideoVisto(
    @Param('eventoId') eventoId: string,
    @Param('cuestionarioId') cuestionarioId: string,
    @Body() body: { ci: string; fechaNacimiento: string },
  ) {
    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) throw new NotFoundException('Participante no registrado');

    await this.prisma.eventoCuestionarioIntento.upsert({
      where: {
        unique_persona_cuestionario: { cuestionarioId, personaId: persona.id },
      },
      update: { videoCompletado: true },
      create: {
        cuestionarioId,
        personaId: persona.id,
        videoCompletado: true,
        numeroIntentos: 0,
      },
    });

    return { success: true };
  }

  @Post(':eventoId/cuestionario/:cuestionarioId/responder')
  async responderCuestionario(
    @Param('eventoId') eventoId: string,
    @Param('cuestionarioId') cuestionarioId: string,
    @Body()
    body: {
      ci: string;
      fechaNacimiento: string;
      respuestas: Array<{
        preguntaId: string;
        opcionId?: string;
        opciones?: string[];
        texto?: string;
      }>;
    },
  ) {
    const cuestionario = await this.prisma.eventoCuestionario.findFirst({
      where: { id: cuestionarioId, eventoId, estado: 'activo' },
      include: {
        preguntas: {
          where: { estado: 'activo' },
          include: { opciones: { where: { estado: 'activo' } } },
        },
      },
    });

    if (!cuestionario)
      throw new NotFoundException('Cuestionario no encontrado');

    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) throw new NotFoundException('Participante no encontrado');

    const intentoActual = await this.prisma.eventoCuestionarioIntento.findFirst(
      {
        where: { cuestionarioId, personaId: persona.id },
      },
    );

    const now = new Date();
    // LOGICA SENIOR RADICAL: Si el cuestionario está marcado como 'activo', permitimos responder
    // independientemente de la fecha de fin, para evitar problemas de zona horaria y cierres prematuros.
    if (now < cuestionario.fechaInicio) {
      throw new ForbiddenException('El cuestionario aún no ha comenzado');
    }
    
    // Eliminamos el bloqueo por fechaFin. Solo el estado 'activo' manda.

    if (cuestionario.urlVideo && !intentoActual?.videoCompletado) {
      throw new ForbiddenException(
        'Debes terminar de ver el video obligatorio antes de responder el cuestionario.',
      );
    }

    // Si NO es evaluativo, solo se puede completar una vez
    if (!cuestionario.esEvaluativo) {
      if (intentoActual && (intentoActual.numeroIntentos || 0) >= 1) {
        throw new ForbiddenException(
          'Este formulario ya fue completado. Solo se puede enviar una vez.',
        );
      }
    } else {
      // Si es evaluativo, respetar el límite de intentos configurado
      if (
        cuestionario.limiteIntentos !== null &&
        (intentoActual?.numeroIntentos || 0) >= cuestionario.limiteIntentos
      ) {
        throw new ForbiddenException(
          'Has superado el límite de intentos permitidos para este cuestionario.',
        );
      }
    }

    const yaRespondio = await this.prisma.evento_respuestas.findFirst({
      where: {
        cuestionarioId,
        personaId: persona.id,
        deletedAt: null,
      },
    });

    // Solo borrar respuestas anteriores si es evaluativo (permite reintentos)
    if (yaRespondio && cuestionario.esEvaluativo) {
      await this.prisma.evento_respuestas.deleteMany({
        where: { cuestionarioId, personaId: persona.id },
      });
    } else if (yaRespondio && !cuestionario.esEvaluativo) {
      throw new ForbiddenException('Este formulario ya fue completado.');
    }

    let puntajeTotal = 0;
    const respuestasData: any[] = [];

    for (const resp of body.respuestas) {
      const pregunta = cuestionario.preguntas.find(
        (p) => p.id === resp.preguntaId,
      );
      if (!pregunta) continue;

      if (pregunta.tipo === 'SINGLE' || pregunta.tipo === 'TRUE_FALSE') {
        const opcion = pregunta.opciones.find((o) => o.id === resp.opcionId);
        const esCorrecta = cuestionario.esEvaluativo
          ? opcion?.esCorrecta || false
          : false;
        const puntos =
          cuestionario.esEvaluativo && esCorrecta ? pregunta.puntos : 0;
        puntajeTotal += puntos;

        respuestasData.push({
          cuestionarioId,
          preguntaId: resp.preguntaId,
          opcionId: resp.opcionId || null,
          texto: opcion?.texto || null,
          esCorrecta,
          puntos,
          personaId: persona.id,
        });
      } else if (pregunta.tipo === 'MULTIPLE') {
        const opciones = resp.opciones || [];
        for (const opcId of opciones) {
          const opcion = pregunta.opciones.find((o) => o.id === opcId);
          const esCorrecta = cuestionario.esEvaluativo
            ? opcion?.esCorrecta || false
            : false;
          const puntosParciales =
            cuestionario.esEvaluativo && esCorrecta
              ? Math.round(
                  pregunta.puntos /
                    (pregunta.opciones.filter((o) => o.esCorrecta).length || 1),
                )
              : 0;
          puntajeTotal += puntosParciales;
          respuestasData.push({
            cuestionarioId,
            preguntaId: resp.preguntaId,
            opcionId: opcId,
            texto: opcion?.texto || null,
            esCorrecta,
            puntos: puntosParciales,
            personaId: persona.id,
          });
        }
      } else if (pregunta.tipo === 'TEXTO') {
        respuestasData.push({
          cuestionarioId,
          preguntaId: resp.preguntaId,
          opcionId: null,
          texto: resp.texto || '',
          esCorrecta: false,
          puntos: 0,
          personaId: persona.id,
        });
      }
    }

    await this.prisma.evento_respuestas.createMany({ data: respuestasData });

    // Calcular puntaje máximo solo si es evaluativo
    let puntajeMaximo = 0;
    let nota = 0;

    if (cuestionario.esEvaluativo) {
      // Base: suma de puntos de TODAS las preguntas activas
      const totalPuntosTodasPreguntas = cuestionario.preguntas.reduce(
        (s, p) => s + p.puntos,
        0,
      );
      puntajeMaximo = totalPuntosTodasPreguntas;

      // Si hay cantidad de preguntas a mostrar (aleatorio limitado),
      // el máximo es proporcional: promedio por pregunta × cantidad a mostrar
      if (
        cuestionario.cantidadPreguntas &&
        cuestionario.cantidadPreguntas > 0 &&
        cuestionario.preguntas.length > 0
      ) {
        const puntosPromedio =
          totalPuntosTodasPreguntas / cuestionario.preguntas.length;
        puntajeMaximo = Math.round(
          puntosPromedio * cuestionario.cantidadPreguntas,
        );
      }

      // Si el cuestionario tiene puntosMaximos explícito configurado, usarlo (prioridad)
      if (cuestionario.puntosMaximos && cuestionario.puntosMaximos > 0) {
        puntajeMaximo = cuestionario.puntosMaximos;
      }

      nota =
        puntajeMaximo > 0
          ? Math.round((puntajeTotal / puntajeMaximo) * 100)
          : 0;
    }

    await this.prisma.eventoCuestionarioIntento.upsert({
      where: {
        unique_persona_cuestionario: { cuestionarioId, personaId: persona.id },
      },
      update: {
        numeroIntentos: { increment: 1 },
        puntaje: puntajeTotal,
        estado: 'finished',
        finalizadoEn: new Date(),
      },
      create: {
        cuestionarioId,
        personaId: persona.id,
        numeroIntentos: 1,
        puntaje: puntajeTotal,
        estado: 'finished',
        finalizadoEn: new Date(),
      },
    });

    return {
      success: true,
      esEvaluativo: cuestionario.esEvaluativo,
      puntaje: cuestionario.esEvaluativo ? puntajeTotal : null,
      puntajeMaximo: cuestionario.esEvaluativo ? puntajeMaximo : null,
      nota: cuestionario.esEvaluativo ? nota : null,
      persona: { ...persona, ci: persona.ci.toString() },
      cuestionario: { titulo: cuestionario.titulo },
      evento: { id: eventoId },
    };
  }

  @Post(':eventoId/cuestionario/:cuestionarioId/resultado')
  async getResultado(
    @Param('cuestionarioId') cuestionarioId: string,
    @Param('eventoId') eventoId: string,
    @Body() body: { ci: string; fechaNacimiento: string },
  ) {
    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) throw new NotFoundException('Participante no encontrado');

    const respuestas = await this.prisma.evento_respuestas.findMany({
      where: { cuestionarioId, personaId: persona.id, deletedAt: null },
      include: { pregunta: true, opcion: true },
    });

    if (respuestas.length === 0)
      throw new NotFoundException(
        'No se encontraron respuestas para este cuestionario',
      );

    const cuestionario = await this.prisma.eventoCuestionario.findFirst({
      where: { id: cuestionarioId },
      include: { evento: true },
    });

    const puntajeTotal = respuestas.reduce((s, r) => s + r.puntos, 0);

    // Calcular puntaje máximo basado en las preguntas respondidas si hay límite/aleatorio
    let puntajeMaximo = cuestionario?.puntosMaximos || 0;
    if (
      !puntajeMaximo ||
      (cuestionario?.cantidadPreguntas && cuestionario.cantidadPreguntas > 0)
    ) {
      const uniquePreguntas = Array.from(
        new Set(respuestas.map((r) => r.preguntaId)),
      );
      puntajeMaximo = uniquePreguntas.reduce((acc, pId) => {
        const r = respuestas.find((resp) => resp.preguntaId === pId);
        return acc + (r?.pregunta?.puntos || 0);
      }, 0);
    }
    if (puntajeMaximo === 0) puntajeMaximo = 100;

    const nota = Math.round((puntajeTotal / puntajeMaximo) * 100);

    return {
      persona: { ...persona, ci: persona.ci.toString() },
      cuestionario,
      puntaje: puntajeTotal,
      puntajeMaximo,
      nota,
      aprobado: nota >= 75,
      respuestas: respuestas.map((r) => ({
        pregunta: r.pregunta.texto,
        respuesta: r.texto || r.opcion?.texto,
        esCorrecta: r.esCorrecta,
        puntos: r.puntos,
      })),
    };
  }

  @Post(':eventoId/progreso')
  async getInscripcionProgress(
    @Param('eventoId') eventoId: string,
    @Body() body: { ci: string; fechaNacimiento: string },
  ) {
    const persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: BigInt(body.ci),
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) throw new NotFoundException('Participante no encontrado');

    const inscripcion = await this.prisma.eventoInscripcion.findFirst({
      where: { personaId: persona.id, eventoId, deletedAt: null },
    });

    if (!inscripcion)
      throw new NotFoundException('No estás inscrito en este evento');

    const cuestionarios = await this.prisma.eventoCuestionario.findMany({
      where: { eventoId, estado: 'activo' },
      orderBy: { orden: 'asc' },
    });

    const progress = await Promise.all(
      cuestionarios.map(async (c) => {
        const respuestas = await this.prisma.evento_respuestas.findMany({
          where: {
            cuestionarioId: c.id,
            personaId: persona.id,
            deletedAt: null,
          },
          include: { pregunta: true },
        });

        const intento = await this.prisma.eventoCuestionarioIntento.findFirst({
          where: { cuestionarioId: c.id, personaId: persona.id },
        });

        const finalizado = respuestas.length > 0 || (intento?.estado === 'finished' || (intento?.numeroIntentos || 0) > 0);
        let aprobado = false;
        let puntajeTotal = 0;
        let puntajeMaximo = 0;
        let nota = 0;

        if (finalizado) {
          if (!c.esEvaluativo) {
            aprobado = true;
          } else {
            puntajeTotal = respuestas.reduce((s, r) => s + r.puntos, 0);

            puntajeMaximo = c.puntosMaximos || 0;
            if (
              !puntajeMaximo ||
              (c.cantidadPreguntas && c.cantidadPreguntas > 0)
            ) {
              // Sumar puntos de preguntas únicas respondidas
              const uniquePreguntas = Array.from(
                new Set(respuestas.map((r) => r.preguntaId)),
              );
              puntajeMaximo = uniquePreguntas.reduce((acc, pId) => {
                const r = respuestas.find((resp) => resp.preguntaId === pId);
                return acc + (r?.pregunta?.puntos || 0);
              }, 0);
            }
            if (puntajeMaximo === 0) puntajeMaximo = 100;

            nota = Math.round((puntajeTotal / puntajeMaximo) * 100);
            aprobado = nota >= 75;
          }
        }

        return {
          id: c.id,
          titulo: c.titulo,
          orden: c.orden,
          esObligatorio: c.esObligatorio,
          esEvaluativo: c.esEvaluativo,
          finalizado,
          aprobado,
          puntaje: puntajeTotal,
          puntajeMaximo,
          nota,
          limiteIntentos: c.limiteIntentos,
          urlVideo: c.urlVideo,
          esAleatorio: c.esAleatorio,
          cantidadPreguntas: c.cantidadPreguntas,
          numeroIntentos: intento?.numeroIntentos || 0,
          videoCompletado: intento?.videoCompletado || false,
        };
      }),
    );

    return {
      persona: { ...persona, ci: persona.ci.toString() },
      progress,
    };
  }
}
