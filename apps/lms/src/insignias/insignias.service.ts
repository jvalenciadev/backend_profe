import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class InsigniasService {
    constructor(private readonly prisma: PrismaService) { }

    async getInsigniasDisponibles() {
        return this.prisma.mod_insignia.findMany({
            orderBy: { createdAt: 'asc' }
        });
    }

    async getInsigniasUsuario(userId: string) {
        return this.prisma.mod_insignia_user.findMany({
            where: { userId },
            include: { insignia: true }
        });
    }

    async otorgarInsignia(userId: string, tipo: string) {
        const insignia = await this.prisma.mod_insignia.findFirst({
            where: { tipo }
        });
        if (!insignia) return null;

        const existing = await this.prisma.mod_insignia_user.findFirst({
            where: { userId, insigniaId: insignia.id }
        });
        if (existing) return existing;

        return this.prisma.mod_insignia_user.create({
            data: { userId, insigniaId: insignia.id }
        });
    }

    /**
     * Facilitor otorga una insignia manualmente a un participante.
     * Verifica que el facilitador tenga asignación activa en algún módulo.
     */
    async otorgarInsigniaManual(
        facilitadorId: string,
        data: { targetUserId: string; insigniaId: string }
    ) {
        // Verificar que el solicitante es facilitador
        const isFac = await this.prisma.programaDosFacilitador.findFirst({
            where: { facilitadorId, estado: 'activo' }
        });
        if (!isFac) throw new ForbiddenException('Solo un facilitador puede otorgar insignias');

        // Verificar que la insignia existe
        const insignia = await this.prisma.mod_insignia.findUnique({
            where: { id: data.insigniaId }
        });
        if (!insignia) throw new NotFoundException('Insignia no encontrada');

        // Verificar si ya la tiene
        const existing = await this.prisma.mod_insignia_user.findFirst({
            where: { userId: data.targetUserId, insigniaId: data.insigniaId }
        });
        if (existing) return { already: true, record: existing };

        const record = await this.prisma.mod_insignia_user.create({
            data: {
                userId: data.targetUserId,
                insigniaId: data.insigniaId
            },
            include: { insignia: true }
        });
        return { already: false, record };
    }

    /**
     * Revoca una insignia otorgada a un participante.
     */
    async revocarInsignia(facilitadorId: string, data: { targetUserId: string; insigniaId: string }) {
        const isFac = await this.prisma.programaDosFacilitador.findFirst({
            where: { facilitadorId, estado: 'activo' }
        });
        if (!isFac) throw new ForbiddenException('Solo un facilitador puede revocar insignias');

        const record = await this.prisma.mod_insignia_user.findFirst({
            where: { userId: data.targetUserId, insigniaId: data.insigniaId }
        });
        if (!record) throw new NotFoundException('El estudiante no tiene esa insignia');

        await this.prisma.mod_insignia_user.delete({ where: { id: record.id } });
        return { success: true };
    }

    /**
     * Lista las insignias de todos los participantes de un módulo/turno.
     */
    async getInsigniasPorModulo(moduloId: string, turnoId?: string) {
        // Obtener inscripciones del módulo
        const modOper = await this.prisma.programaModuloDos.findUnique({
            where: { id: moduloId }
        });
        const modMaestro = !modOper ? await this.prisma.programaModulo.findUnique({
            where: { id: moduloId }
        }) : null;

        let inscripciones: any[] = [];
        if (modOper) {
            inscripciones = await this.prisma.programaInscripcion.findMany({
                where: {
                    programaId: modOper.programaDosId,
                    ...(turnoId ? { turnoId } : {}),
                    estado: { in: ['activo', 'aprobado'] }
                },
                include: {
                    persona: { select: { id: true, nombre: true, apellidos: true, imagen: true, correo: true } }
                }
            });
        } else if (modMaestro) {
            inscripciones = await this.prisma.programaInscripcion.findMany({
                where: {
                    programa: { programaId: modMaestro.programaId },
                    estado: { in: ['activo', 'aprobado'] }
                },
                include: {
                    persona: { select: { id: true, nombre: true, apellidos: true, imagen: true, correo: true } }
                }
            });
        }

        const userIds = inscripciones.map(i => i.personaId);

        const insigniasUser = await this.prisma.mod_insignia_user.findMany({
            where: { userId: { in: userIds } },
            include: { insignia: true }
        });

        return inscripciones.map(ins => ({
            userId: ins.personaId,
            nombre: `${ins.persona.nombre} ${ins.persona.apellidos}`,
            imagen: ins.persona.imagen,
            correo: ins.persona.correo,
            insignias: insigniasUser
                .filter(iu => iu.userId === ins.personaId)
                .map(iu => {
                    const { id: badgeId, ...badgeData } = iu.insignia;
                    return {
                        id: iu.id, // ID del registro mod_insignia_user
                        insigniaId: badgeId,
                        ...badgeData,
                        otorgadoEn: iu.otorgadoEn
                    };
                })
        }));
    }

    async createInsignia(data: any) {
        const { nombre, descripcion, icono, color, tipo } = data;
        return this.prisma.mod_insignia.create({
            data: { nombre, descripcion, icono, color, tipo }
        });
    }

    async updateInsignia(id: string, data: any) {
        const { nombre, descripcion, icono, color, tipo } = data;
        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (icono !== undefined) updateData.icono = icono;
        if (color !== undefined) updateData.color = color;
        if (tipo !== undefined) updateData.tipo = tipo;
        
        return this.prisma.mod_insignia.update({ where: { id }, data: updateData });
    }

    async deleteInsignia(id: string) {
        // First delete assignments (insignia_user)
        await this.prisma.mod_insignia_user.deleteMany({ where: { insigniaId: id } });
        return this.prisma.mod_insignia.delete({ where: { id } });
    }
}
