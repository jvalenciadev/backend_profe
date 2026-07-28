import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';

import { Estado } from '@prisma/client';

/**
 * CONTROLADOR DE VISTAS DE EVENTOS
 * Requiere API_SECRET (X-SECRET) pero no sesión de usuario.
 */
@Controller('public/eventos')
export class EventViewsController {
  constructor(private readonly prisma: PrismaService) { }

  private parseCi(ci: string | number | undefined | null): bigint {
    if (ci === undefined || ci === null) return BigInt(0);
    const ciStr = String(ci).trim();
    const cleanStr = ciStr.split('-')[0].trim();
    const numericStr = cleanStr.replace(/\D/g, '');
    return BigInt(numericStr || '0');
  }

  @Get('facilitador/eventos-stats')
  async getEventosStatsFacilitador(
    @Query('tenant') tenant?: string,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    let tenantIdFilter: string | undefined = tenantIdQuery || tenant;

    if (tenantIdFilter && tenantIdFilter !== 'null' && tenantIdFilter !== 'undefined') {
      const dep = await this.prisma.departamento.findFirst({
        where: {
          OR: [
            { id: tenantIdFilter },
            { abreviacion: tenantIdFilter.toUpperCase() },
            { nombre: { contains: tenantIdFilter, mode: 'insensitive' } },
          ],
        },
      });
      if (dep) tenantIdFilter = dep.id;
    } else {
      tenantIdFilter = undefined;
    }

    const eventos = await this.prisma.evento.findMany({
      where: {
        deletedAt: null,
        ...(tenantIdFilter
          ? { tenantId: tenantIdFilter }
          : {}),
      },
      orderBy: { fecha: 'desc' },
      take: 50,
      include: {
        tipo: true,
        tenant: true,
      },
    });

    const result = await Promise.all(
      eventos.map(async (e) => {
        const inscritosCount = await this.prisma.eventoInscripcion.count({
          where: { eventoId: e.id, deletedAt: null },
        });
        const asistieronCount = await this.prisma.eventoInscripcion.count({
          where: { eventoId: e.id, asistencia: true, deletedAt: null },
        });
        return {
          id: e.id,
          nombre: e.nombre,
          codigo: e.codigo,
          codigoAsistencia: e.codigoAsistencia,
          lugar: e.lugar,
          fecha: e.fecha,
          tenantId: e.tenantId,
          departamentoNombre: e.tenant?.nombre,
          tipoNombre: e.tipo?.nombre,
          totalInscritos: inscritosCount,
          totalAsistieron: asistieronCount,
        };
      }),
    );

    return result;
  }

  @Get(':eventoId/participantes/buscar')
  async buscarParticipante(
    @Param('eventoId') eventoId: string,
    @Query('query') query: string,
  ) {
    if (!query || query.trim().length === 0) return [];

    const ciNum = this.parseCi(query);
    const personas = await this.prisma.eventoPersona.findMany({
      where: {
        OR: [
          ...(ciNum > BigInt(0) ? [{ ci: ciNum }] : []),
          { nombre1: { contains: query, mode: 'insensitive' } },
          { nombre2: { contains: query, mode: 'insensitive' } },
          { apellido1: { contains: query, mode: 'insensitive' } },
          { apellido2: { contains: query, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      take: 15,
    });

    const result = await Promise.all(
      personas.map(async (p) => {
        const inscripcion = await this.prisma.eventoInscripcion.findFirst({
          where: { personaId: p.id, eventoId, deletedAt: null },
        });
        if (!inscripcion) return null;
        const nombreCompleto = `${p.nombre1} ${p.nombre2 || ''} ${p.apellido1} ${p.apellido2 || ''}`.replace(/\s+/g, ' ').trim();
        return {
          id: p.id,
          inscripcionId: inscripcion.id,
          nombre: nombreCompleto,
          ci: p.ci.toString(),
          asistencia: inscripcion.asistencia,
        };
      }),
    );

    return result.filter(Boolean);
  }

  @Get(':codigo')
  async getEvento(@Param('codigo') codigo: string) {
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        codigo,
      );
    const evento = await this.prisma.evento.findFirst({
      where: {
        OR: [{ codigo }, ...(isUuid ? [{ id: codigo }] : [])],
        estado: { in: ['activo', 'finalizado', 'vista'] },
      },
      include: {
        tipo: true,
        tenant: true,
        camposExtras: {
          where: { deletedAt: null },
          orderBy: { orden: 'asc' },
        },
        cuestionarios: {
          where: { estado: { in: ['activo', 'prologa' as any] } },
          orderBy: { orden: 'asc' },
          include: {
            preguntas: {
              where: { estado: 'activo' },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              include: {
                opciones: {
                  where: { estado: 'activo' },
                  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    if (!evento) throw new NotFoundException('Evento no encontrado');

    const sanitized = {
      ...(evento as any),
      cuestionarios: (evento as any).cuestionarios.map((c: any) => {
        const preguntas = [...c.preguntas];

        if (c.esAleatorio) {
          // Fisher-Yates shuffle para eventos si esAleatorio es true
          for (let i = preguntas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [preguntas[i], preguntas[j]] = [preguntas[j], preguntas[i]];
          }

          // También mezclar opciones si es aleatorio
          preguntas.forEach((p: any) => {
            if (p.opciones && p.opciones.length > 0) {
              for (let i = p.opciones.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [p.opciones[i], p.opciones[j]] = [p.opciones[j], p.opciones[i]];
              }
            }
          });
        }

        return {
          ...c,
          preguntas: preguntas.map((p: any) => ({
            ...p,
            opciones: p.opciones.map(({ esCorrecta: _, ...opt }: any) => opt),
          })),
        };
      }),
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
        ci: this.parseCi(ci),
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
      isEditingProfile?: boolean;
    },
  ) {
    const evento = await this.prisma.evento.findFirst({
      where: {
        id: eventoId,
        estado: { in: ['activo', 'finalizado', 'vista'] },
      },
    });

    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.estado === 'finalizado') {
      throw new ForbiddenException('El evento ha finalizado');
    }
    if (body.isEditingProfile) {
      // Se permite actualizar datos si el evento no ha finalizado
    } else {
      if (evento.estado !== 'activo' || !evento.inscripcionAbierta) {
        throw new ForbiddenException('La inscripción está cerrada');
      }
    }

    let ciLimpio = body.ci;
    let complemento = body.complemento || '';
    if (body.ci && String(body.ci).includes('-')) {
      const parts = String(body.ci).split('-');
      ciLimpio = parts[0].trim();
      if (!complemento) {
        complemento = parts[1].trim();
      }
    }
    const ciBigInt = this.parseCi(ciLimpio);

    let persona = await this.prisma.eventoPersona.findFirst({
      where: {
        ci: ciBigInt,
        fechaNacimiento: new Date(body.fechaNacimiento),
        deletedAt: null,
      },
    });

    if (!persona) {
      persona = await this.prisma.eventoPersona.create({
        data: {
          ci: ciBigInt,
          complemento: complemento || '',
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

    if (existente) {
      if (body.isEditingProfile) {
        return {
          persona: {
            ...persona,
            ci: persona.ci.toString(),
            generoId: persona.generoId.toString(),
          },
          inscripcion: {
            ...existente,
            id: existente.id.toString(),
            personaId: existente.personaId.toString(),
            departamentoId: existente.departamentoId.toString(),
            modalidadId: existente.modalidadId.toString(),
          },
        };
      }
      throw new ConflictException('Ya estás inscrito en este evento');
    }

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
        ci: this.parseCi(body.ci),
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
        ci: this.parseCi(body.ci),
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
        ci: this.parseCi(body.ci),
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
        ci: this.parseCi(body.ci),
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

    // LOGICA SENIOR: Si el cuestionario tiene video pero la DB no lo marcó (error de sync),
    // lo marcamos ahora mismo para no bloquear al usuario si ya está enviando respuestas.
    if (cuestionario.urlVideo && !intentoActual?.videoCompletado) {
      await this.prisma.eventoCuestionarioIntento.upsert({
        where: {
          unique_persona_cuestionario: {
            cuestionarioId,
            personaId: persona.id,
          },
        },
        update: { videoCompletado: true },
        create: {
          cuestionarioId,
          personaId: persona.id,
          videoCompletado: true,
          numeroIntentos: 0,
        },
      });
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
      aprobado: cuestionario.esEvaluativo
        ? nota >= (cuestionario.puntajeMinimo || 75)
        : true,
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
        ci: this.parseCi(body.ci),
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
      aprobado: nota >= (cuestionario?.puntajeMinimo || 75),
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
        ci: this.parseCi(body.ci),
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
      where: { eventoId, estado: { in: ['activo', 'prologa' as any] } },
      orderBy: { orden: 'asc' },
    });

    const cuestionarioIds = cuestionarios.map((c) => c.id);

    // Búsqueda batch de respuestas e intentos para evitar consultas N+1
    const todasLasRespuestas = await this.prisma.evento_respuestas.findMany({
      where: {
        cuestionarioId: { in: cuestionarioIds },
        personaId: persona.id,
        deletedAt: null,
      },
      include: { pregunta: true },
    });

    const todosLosIntentos =
      await this.prisma.eventoCuestionarioIntento.findMany({
        where: {
          cuestionarioId: { in: cuestionarioIds },
          personaId: persona.id,
        },
      });

    const progress = cuestionarios.map((c) => {
      const respuestas = todasLasRespuestas.filter(
        (r) => r.cuestionarioId === c.id,
      );
      const intento = todosLosIntentos.find((i) => i.cuestionarioId === c.id);

      const finalizado =
        respuestas.length > 0 ||
        intento?.estado === 'finished' ||
        (intento?.numeroIntentos || 0) > 0;
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
          aprobado = nota >= (c.puntajeMinimo || 75);
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
    });

    return {
      persona: { ...persona, ci: persona.ci.toString() },
      progress,
    };
  }
}
