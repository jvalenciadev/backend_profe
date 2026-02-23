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
import { Public } from '@app/common';

@Public()
@Controller('public/eventos')
export class EventosPublicoController {
    constructor(private readonly prisma: PrismaService) { }

    // ─── GET EVENTO DETALLE PÚBLICO ────────────────────────────────────────────
    @Get(':codigo')
    async getEvento(@Param('codigo') codigo: string) {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(codigo);
        const evento = await this.prisma.evento.findFirst({
            where: {
                OR: [
                    { codigo },
                    ...(isUuid ? [{ id: codigo }] : [])
                ],
                estado: 'activo',
            },
            include: {
                tipo: true,
                tenant: true,
                cuestionarios: {
                    where: { estado: 'activo' },
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

        // Ocultar si la opción es correcta para no hacer trampa
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

        return sanitized;
    }

    // ─── BUSCAR PERSONA POR CI + FECHA NACIMIENTO ───────────────────────────────
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

    // ─── INSCRIPCION A EVENTO ───────────────────────────────────────────────────
    @Post(':eventoId/inscribir')
    async inscribirse(
        @Param('eventoId') eventoId: string,
        @Body()
        body: {
            // datos identificacion
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
        },
    ) {
        const evento = await this.prisma.evento.findFirst({
            where: { id: eventoId, estado: 'activo' },
        });

        if (!evento) throw new NotFoundException('Evento no encontrado');
        if (!evento.inscripcionAbierta)
            throw new ForbiddenException('La inscripción está cerrada');

        // Buscar o crear persona
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
            // Actualizar datos si ya existe
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

        // Verificar si ya está inscrito
        const existente = await this.prisma.eventoInscripcion.findFirst({
            where: { personaId: persona.id, eventoId, deletedAt: null },
        });

        if (existente)
            throw new ConflictException('Ya estás inscrito en este evento');

        // Verificar cupo
        if (evento.totalInscritos <= 0)
            throw new ForbiddenException('No hay cupos disponibles');

        // Crear inscripción
        const inscripcion = await this.prisma.eventoInscripcion.create({
            data: {
                personaId: persona.id,
                eventoId,
                departamentoId: body.departamentoId,
                modalidadId: body.modalidadId,
                asistencia: false,
                estado: 'activo',
            },
        });

        // Decrementar cupo
        await this.prisma.evento.update({
            where: { id: eventoId },
            data: { totalInscritos: { decrement: 1 } },
        });

        return {
            success: true,
            inscripcion: { id: inscripcion.id },
            persona: { ...persona, ci: persona.ci.toString() },
            evento: { nombre: evento.nombre, fecha: evento.fecha, lugar: evento.lugar },
        };
    }

    // ─── VERIFICAR INSCRIPCION ──────────────────────────────────────────────────
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

    // ─── ASISTENCIA POR CÓDIGO ──────────────────────────────────────────────────
    @Post(':eventoId/asistencia')
    async registrarAsistencia(
        @Param('eventoId') eventoId: string,
        @Body() body: { ci: string; fechaNacimiento: string; codigoAsistencia: string },
    ) {
        const evento = await this.prisma.evento.findFirst({
            where: { id: eventoId, estado: 'activo' },
        });

        if (!evento) throw new NotFoundException('Evento no encontrado');

        // Validar código
        if (!evento.codigoAsistencia)
            throw new ForbiddenException('Este evento no tiene código de asistencia activo');

        if (evento.codigoAsistencia.trim().toUpperCase() !== body.codigoAsistencia.trim().toUpperCase())
            throw new ForbiddenException('Código de asistencia incorrecto');

        // Buscar persona
        const persona = await this.prisma.eventoPersona.findFirst({
            where: {
                ci: BigInt(body.ci),
                fechaNacimiento: new Date(body.fechaNacimiento),
                deletedAt: null,
            },
        });

        if (!persona) throw new NotFoundException('Participante no registrado en el evento');

        const inscripcion = await this.prisma.eventoInscripcion.findFirst({
            where: { personaId: persona.id, eventoId, deletedAt: null },
        });

        if (!inscripcion) throw new NotFoundException('No estás inscrito en este evento');
        if (inscripcion.asistencia)
            throw new ConflictException('Tu asistencia ya fue registrada anteriormente');

        // Registrar asistencia
        await this.prisma.eventoInscripcion.update({
            where: { id: inscripcion.id },
            data: { asistencia: true },
        });

        return {
            success: true,
            persona: { ...persona, ci: persona.ci.toString() },
            evento: { nombre: evento.nombre, fecha: evento.fecha, lugar: evento.lugar },
            inscripcion: inscripcion.id,
        };
    }

    // ─── ENVIAR RESPUESTAS DE CUESTIONARIO ─────────────────────────────────────
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
                opcionId?: string; // para SINGLE, MULTIPLE, TRUE_FALSE
                opciones?: string[]; // para MULTIPLE
                texto?: string; // para TEXTO
            }>;
        },
    ) {
        // Verificar cuestionario
        const cuestionario = await this.prisma.eventoCuestionario.findFirst({
            where: { id: cuestionarioId, eventoId, estado: 'activo' },
            include: {
                preguntas: {
                    where: { estado: 'activo' },
                    include: { opciones: { where: { estado: 'activo' } } },
                },
            },
        });

        if (!cuestionario) throw new NotFoundException('Cuestionario no encontrado');

        const now = new Date();
        if (now < cuestionario.fechaInicio)
            throw new ForbiddenException('El cuestionario aún no ha comenzado');
        if (now > cuestionario.fechaFin)
            throw new ForbiddenException('El cuestionario ya ha cerrado');

        // Buscar persona
        const persona = await this.prisma.eventoPersona.findFirst({
            where: {
                ci: BigInt(body.ci),
                fechaNacimiento: new Date(body.fechaNacimiento),
                deletedAt: null,
            },
        });

        if (!persona) throw new NotFoundException('Participante no encontrado');

        // Verificar si ya respondió
        const yaRespondio = await this.prisma.evento_respuestas.findFirst({
            where: {
                cuestionarioId,
                personaId: persona.id,
                deletedAt: null,
            },
        });

        if (yaRespondio)
            throw new ConflictException('Ya enviaste tus respuestas para este cuestionario');

        // Calcular puntaje
        let puntajeTotal = 0;
        const respuestasData: any[] = [];

        for (const resp of body.respuestas) {
            const pregunta = cuestionario.preguntas.find((p) => p.id === resp.preguntaId);
            if (!pregunta) continue;

            if (pregunta.tipo === 'SINGLE' || pregunta.tipo === 'TRUE_FALSE') {
                const opcion = pregunta.opciones.find((o) => o.id === resp.opcionId);
                const esCorrecta = opcion?.esCorrecta || false;
                const puntos = esCorrecta ? pregunta.puntos : 0;
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
                // Múltiple: puntaje parcial por respuestas correctas
                const opciones = resp.opciones || [];
                for (const opcId of opciones) {
                    const opcion = pregunta.opciones.find((o) => o.id === opcId);
                    const esCorrecta = opcion?.esCorrecta || false;
                    const puntosParciales = esCorrecta ? Math.round(pregunta.puntos / (pregunta.opciones.filter((o) => o.esCorrecta).length || 1)) : 0;
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
                // Texto libre: sin calificación automática
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

        // Guardar respuestas
        await this.prisma.evento_respuestas.createMany({ data: respuestasData });

        // Si el cuestionario cuenta como asistencia, registrarla
        const inscripcion = await this.prisma.eventoInscripcion.findFirst({
            where: { personaId: persona.id, eventoId, deletedAt: null },
        });
        if (inscripcion) {
            await this.prisma.eventoInscripcion.update({
                where: { id: inscripcion.id },
                data: { asistencia: true },
            });
        }

        const puntajeMaximo = cuestionario.puntosMaximos || cuestionario.preguntas.reduce((s, p) => s + p.puntos, 0);
        const nota = puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 100) : 0;

        return {
            success: true,
            puntaje: puntajeTotal,
            puntajeMaximo,
            nota,
            persona: { ...persona, ci: persona.ci.toString() },
            cuestionario: { titulo: cuestionario.titulo },
            evento: { id: eventoId },
        };
    }

    // ─── GET RESULTADO DE CUESTIONARIO ─────────────────────────────────────────
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
            throw new NotFoundException('No se encontraron respuestas para este cuestionario');

        const cuestionario = await this.prisma.eventoCuestionario.findFirst({
            where: { id: cuestionarioId },
            include: { evento: true },
        });

        const puntajeTotal = respuestas.reduce((s, r) => s + r.puntos, 0);
        const puntajeMaximo = cuestionario?.puntosMaximos || 100;
        const nota = Math.round((puntajeTotal / puntajeMaximo) * 100);

        return {
            persona: { ...persona, ci: persona.ci.toString() },
            cuestionario,
            puntaje: puntajeTotal,
            puntajeMaximo,
            nota,
            aprobado: nota >= 60,
            respuestas: respuestas.map((r) => ({
                pregunta: r.pregunta.texto,
                respuesta: r.texto || r.opcion?.texto,
                esCorrecta: r.esCorrecta,
                puntos: r.puntos,
            })),
        };
    }
}
