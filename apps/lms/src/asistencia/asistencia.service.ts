import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as crypto from 'crypto';

// ──────────────────────────────────────────────────────────────────────────────
//  Constantes de QR
// ──────────────────────────────────────────────────────────────────────────────
const QR_SECRET = process.env.QR_ASISTENCIA_SECRET || 'qr_asistencia_secret_2024_profe';
const QR_TTL_MS = 60 * 60 * 1000; // 60 minutos

function signPayload(data: string): string {
    return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
}

@Injectable()
export class AsistenciaService {
    constructor(private readonly prisma: PrismaService) { }

    // ──────────────────────────────────────────────────────────────────────────
    //  QR TOKEN  —  genera un token firmado para la sesión
    // ──────────────────────────────────────────────────────────────────────────
    async generateQrToken(userId: string, sesionId: string) {
        const sesion = await this.prisma.mod_asistencia.findUnique({
            where: { id: sesionId },
            include: {
                modulo: { include: { programaDos: { include: { sede: true } } } },
                moduloMaestro: { include: { programa: true } }
            }
        });
        if (!sesion) throw new NotFoundException('Sesión no encontrada');

        // Verificar que el solicitante es facilitador de esta sesión
        let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
            where: {
                facilitadorId: userId,
                estado: 'activo',
                OR: [
                    { moduloId: sesion.moduloId || undefined },
                    { moduloMaestroId: sesion.moduloMaestroId || undefined }
                ]
            }
        });

        if (!isFacilitador && sesion.moduloMaestroId) {
            const masterMod = await this.prisma.programaModulo.findUnique({
                where: { id: sesion.moduloMaestroId }
            });
            if (masterMod?.facilitadorId === userId) {
                isFacilitador = { id: 'direct' } as any;
            } else if (masterMod) {
                isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
                    where: {
                        facilitadorId: userId,
                        estado: 'activo',
                        programaDos: { programaId: masterMod.programaId }
                    }
                }) as any;
            }
        }

        if (!isFacilitador) throw new ForbiddenException('No tienes permisos de facilitador para esta sesión');

        // Determinar sedeId: viene del módulo operativo → ProgramaDos → sede
        let sedeId: string = 'global';
        if (sesion.moduloId && sesion.modulo?.programaDos?.sedeId) {
            sedeId = sesion.modulo.programaDos.sedeId;
        }

        const turnoId = sesion.turnoId || 'global';
        const expiry = Date.now() + QR_TTL_MS;

        // Payload: sesionId|turnoId|sedeId|expiry
        const payload = `${sesionId}|${turnoId}|${sedeId}|${expiry}`;
        const sig = signPayload(payload);
        const token = Buffer.from(`${payload}|${sig}`).toString('base64url');

        return {
            token,
            sesionId,
            turnoId,
            sedeId,
            expiry,
            expiresInMinutes: 60
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  MARCAR ASISTENCIA VÍA QR
    // ──────────────────────────────────────────────────────────────────────────
    async marcarAsistenciaQR(userId: string, token: string) {
        // 1. Decodificar y validar token
        let raw: string;
        try {
            raw = Buffer.from(token, 'base64url').toString('utf8');
        } catch {
            throw new BadRequestException('Token QR inválido');
        }

        const parts = raw.split('|');
        if (parts.length !== 5) throw new BadRequestException('Token QR mal formado');

        const [sesionId, turnoId, sedeId, expiryStr, sig] = parts;
        const payload = `${sesionId}|${turnoId}|${sedeId}|${expiryStr}`;
        const expectedSig = signPayload(payload);

        // 2. Verificar firma (timing-safe)
        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
            throw new BadRequestException('Token QR inválido o manipulado');
        }

        // 3. Verificar expiración
        const expiry = parseInt(expiryStr, 10);
        if (Date.now() > expiry) {
            throw new BadRequestException('El código QR ha expirado. Solicite uno nuevo al facilitador.');
        }

        // 4. Verificar sesión existe
        const sesion = await this.prisma.mod_asistencia.findUnique({
            where: { id: sesionId },
            include: {
                modulo: { include: { programaDos: true } }
            }
        });
        if (!sesion) throw new NotFoundException('Sesión de asistencia no encontrada');

        // 5. Validar que el estudiante pertenece a este turno Y sede
        const inscripcion = await this.prisma.programaInscripcion.findFirst({
            where: {
                personaId: userId,
                estado: 'activo',
                ...(turnoId !== 'global' ? { turnoId } : {}),
                ...(sesion.moduloId
                    ? { programaId: sesion.modulo?.programaDos?.id || undefined }
                    : {})
            }
        });

        // También verificar via sede si el turno no filtra suficiente
        if (!inscripcion) {
            const errorMsg = turnoId !== 'global' 
                ? 'No estás inscrito en el turno correspondiente a este código QR.'
                : 'No estás inscrito en el programa o sede correspondiente a este código QR.';
            throw new ForbiddenException(errorMsg);
        }

        // 6. Verificar que no está ya registrado
        const yaRegistrado = await this.prisma.mod_asistencia_reg.findFirst({
            where: { asistenciaId: sesionId, userId }
        });
        if (yaRegistrado) {
            return { success: true, message: 'Tu asistencia ya estaba registrada.', alreadyRegistered: true };
        }

        // 7. Registrar asistencia como 'P' (Presente)
        await this.prisma.mod_asistencia_reg.create({
            data: {
                asistenciaId: sesionId,
                userId,
                estado: 'P',
                observacion: 'Registrado vía QR'
            }
        });

        return { success: true, message: '¡Asistencia registrada correctamente!', alreadyRegistered: false };
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  MÉTODOS EXISTENTES
    // ──────────────────────────────────────────────────────────────────────────
    async getSesionesModulo(id: string, turnoId?: string) {
        const sesiones = await this.prisma.mod_asistencia.findMany({
            where: {
                OR: [
                    { moduloId: id },
                    { moduloMaestroId: id }
                ],
                ...(turnoId ? {
                    OR: [
                        { turnoId: turnoId },
                        { turnoId: null }
                    ]
                } : {})
            },
            orderBy: { fecha: 'desc' },
            include: {
                _count: {
                    select: { registros: true }
                },
                modulo: { select: { nombre: true, codigo: true } },
                moduloMaestro: { select: { nombre: true, codigo: true } }
            }
        });

        // Hidratar con el nombre del turno
        return await Promise.all(sesiones.map(async (s) => {
            let turnoNombre = s.turnoId ? 'Turno' : 'Global';
            if (s.turnoId) {
                const t = await this.prisma.programaDosTurno.findUnique({
                    where: { id: s.turnoId },
                    include: { turnoConfig: true }
                });
                if (t?.turnoConfig) {
                    turnoNombre = t.turnoConfig.nombre;
                }
            }
            return { ...s, turnoNombre };
        }));
    }

    async crearSesion(userId: string, targetId: string, data: { fecha: string; turnoId?: string }) {
        // Identificar si es módulo operativo o maestro
        const modOper = await this.prisma.programaModuloDos.findUnique({ where: { id: targetId } });
        const modMaestro = !modOper ? await this.prisma.programaModulo.findUnique({ where: { id: targetId } }) : null;

        if (!modOper && !modMaestro) throw new NotFoundException('Módulo no encontrado');

        // Verificar si es facilitador (en cualquier turno para este módulo o programa)
        let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
            where: {
                facilitadorId: userId,
                estado: 'activo',
                OR: [
                    { moduloId: targetId },
                    { moduloMaestroId: targetId },
                    { programaDosId: targetId }
                ]
            }
        });

        // FALLBACK: Si es un módulo maestro global, permitir a cualquier facilitador del programa
        // O si es el facilitador asignado directamente en ProgramaModulo
        if (!isFacilitador && modMaestro) {
            if (modMaestro.facilitadorId === userId) {
                isFacilitador = { id: 'direct' } as any;
            } else {
                isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
                    where: {
                        facilitadorId: userId,
                        estado: 'activo',
                        programaDos: { programaId: modMaestro.programaId }
                    }
                });
            }
        }

        if (!isFacilitador) throw new ForbiddenException('No tienes permisos de facilitador para este módulo');

        // Si no viene turnoId, intentar determinarlo de la asignación del facilitador
        // EXCEPCIÓN: Si es un módulo maestro (Modulo 0 / Global), permitimos que sea Global (null)
        let finalTurnoId = data.turnoId;
        if (!finalTurnoId && isFacilitador && (isFacilitador as any).turnoId && !modMaestro) {
            finalTurnoId = (isFacilitador as any).turnoId;
        }

        // Evitar duplicados para la misma fecha y turno
        const existing = await this.prisma.mod_asistencia.findFirst({
            where: {
                moduloId: modOper ? targetId : null,
                moduloMaestroId: modMaestro ? targetId : null,
                turnoId: finalTurnoId || null,
                fecha: new Date(data.fecha)
            }
        });

        if (existing) return existing;

        return this.prisma.mod_asistencia.create({
            data: {
                moduloId: modOper ? targetId : null,
                moduloMaestroId: modMaestro ? targetId : null,
                turnoId: finalTurnoId || null,
                fecha: new Date(data.fecha)
            }
        });
    }

    async getRegistrosSesion(userId: string, asistenciaId: string) {
        const sesion = await this.prisma.mod_asistencia.findUnique({
            where: { id: asistenciaId },
            include: {
                modulo: true,
                moduloMaestro: true
            }
        });
        if (!sesion) throw new NotFoundException('Sesión no encontrada');

        // Determinar el ProgramaDosId y el TurnoId
        let programaId: string | null = null;
        let turnoId: string | undefined;

        // 1. Intentar encontrar asignación directa a este módulo o master
        let facilitator = await this.prisma.programaDosFacilitador.findFirst({
            where: {
                facilitadorId: userId,
                estado: 'activo',
                OR: [
                    { moduloId: sesion.moduloId || undefined },
                    { moduloMaestroId: sesion.moduloMaestroId || undefined }
                ]
            }
        });

        // FALLBACK: Si es master module, buscar cualquier asignación del facilitador en ese programa
        // O si es el facilitador directo en ProgramaModulo
        if (!facilitator && sesion.moduloMaestroId) {
            const masterMod = await this.prisma.programaModulo.findUnique({
                where: { id: sesion.moduloMaestroId },
                include: { programa: true }
            });

            if (masterMod?.facilitadorId === userId) {
                facilitator = {
                    facilitadorId: userId,
                    programaDos: { programaId: masterMod.programaId }
                } as any;
            } else if (masterMod) {
                facilitator = await this.prisma.programaDosFacilitador.findFirst({
                    where: {
                        facilitadorId: userId,
                        estado: 'activo',
                        programaDos: { programaId: masterMod.programaId }
                    },
                    include: { programaDos: true }
                }) as any;
            }
        }

        if (facilitator) {
            turnoId = facilitator.turnoId;
            programaId = facilitator.programaDosId;
        } else {
            const progIdSearch = sesion.modulo?.programaDosId;

            const student = await this.prisma.programaInscripcion.findFirst({
                where: {
                    personaId: userId,
                    estado: 'activo',
                    ...(progIdSearch ? { programaId: progIdSearch } : {})
                }
            });

            if (student) {
                turnoId = student.turnoId || undefined;
                programaId = student.programaId;
            }
        }

        // Get students
        let whereInscripcion: any = { estado: 'activo' };

        // El turno y programa deben venir de la SESION, no del usuario actual
        const targetTurnoId = sesion.turnoId;

        if (sesion.moduloMaestroId) {
            const masterMod = await this.prisma.programaModulo.findUnique({
                where: { id: sesion.moduloMaestroId }
            });
            whereInscripcion.programa = { programaId: masterMod?.programaId };
        } else if (sesion.moduloId) {
            const operMod = await this.prisma.programaModuloDos.findUnique({
                where: { id: sesion.moduloId }
            });
            whereInscripcion.programaId = operMod?.programaDosId;
            if (targetTurnoId) {
                whereInscripcion.turnoId = targetTurnoId;
            }
        }

        const inscripciones = await this.prisma.programaInscripcion.findMany({
            where: whereInscripcion,
            include: {
                persona: {
                    select: { id: true, nombre: true, apellidos: true, imagen: true }
                }
            }
        });

        const registrosExistentes = await this.prisma.mod_asistencia_reg.findMany({
            where: { asistenciaId }
        });

        const turnos = await this.prisma.programaDosTurno.findMany({
            where: { id: { in: inscripciones.map(i => i.turnoId).filter(Boolean) as string[] } },
            include: { turnoConfig: true }
        });

        return inscripciones.map(i => {
            const reg = registrosExistentes.find(r => r.userId === i.personaId);
            const studentTurno = turnos.find(t => t.id === i.turnoId);
            return {
                userId: i.personaId,
                nombre: `${i.persona.nombre} ${i.persona.apellidos}`,
                imagen: i.persona.imagen,
                estado: reg ? reg.estado : 'P',
                observacion: reg ? reg.observacion : '',
                registroId: reg ? reg.id : null,
                turnoNombre: studentTurno?.turnoConfig?.nombre || 'S/T'
            };
        });
    }

    async registrarAsistencia(userId: string, asistenciaId: string, data: { registros: any[] }) {
        const sesion = await this.prisma.mod_asistencia.findUnique({
            where: { id: asistenciaId }
        });
        if (!sesion) throw new NotFoundException('Sesión no encontrada');

        // Verificar permisos con fallback para masters
        let isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
            where: {
                facilitadorId: userId,
                estado: 'activo',
                OR: [
                    { moduloId: sesion.moduloId || undefined },
                    { moduloMaestroId: sesion.moduloMaestroId || undefined }
                ]
            }
        });

        if (!isFacilitador && sesion.moduloMaestroId) {
            const masterMod = await this.prisma.programaModulo.findUnique({
                where: { id: sesion.moduloMaestroId }
            });
            if (masterMod?.facilitadorId === userId) {
                isFacilitador = { id: 'direct' } as any;
            } else if (masterMod) {
                isFacilitador = await this.prisma.programaDosFacilitador.findFirst({
                    where: {
                        facilitadorId: userId,
                        estado: 'activo',
                        programaDos: { programaId: masterMod.programaId }
                    }
                }) as any;
            }
        }

        if (!isFacilitador) throw new ForbiddenException('No tienes permisos para registrar asistencia');

        const promises = data.registros.map(r => {
            return this.prisma.mod_asistencia_reg.upsert({
                where: {
                    id: r.registroId || '00000000-0000-0000-0000-000000000000'
                },
                update: {
                    estado: r.estado,
                    observacion: r.observacion
                },
                create: {
                    asistenciaId,
                    userId: r.userId,
                    estado: r.estado,
                    observacion: r.observacion
                }
            });
        });

        await Promise.all(promises);
        return { success: true };
    }

    async getAsistenciaEstudiante(userId: string, id: string) {
        // Encontrar la inscripción del estudiante para determinar su turno
        const inscripcion = await this.prisma.programaInscripcion.findFirst({
            where: {
                personaId: userId,
                estado: 'activo',
                OR: [
                    { programaId: id }, // id es ProgramaDosId
                    { programa: { modulos: { some: { id } } } }, // id es modulo operativa
                    { programa: { programa: { modulos: { some: { id } } } } } // id es modulo maestro
                ]
            }
        });

        const studentTurnoId = inscripcion?.turnoId;

        const sesiones = await this.prisma.mod_asistencia.findMany({
            where: {
                OR: [
                    { moduloId: id },
                    { moduloMaestroId: id }
                ],
                // Ver solo sesiones de su turno o globales
                turnoId: studentTurnoId || null
            },
            include: {
                registros: {
                    where: { userId }
                }
            },
            orderBy: { fecha: 'desc' }
        });

        return sesiones.map(s => ({
            id: s.id,
            fecha: s.fecha,
            estado: s.registros[0]?.estado || 'N/A'
        }));
    }
}
