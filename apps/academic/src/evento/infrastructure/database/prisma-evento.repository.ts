import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IEventoRepository } from '../../domain/repositories/evento.repository.interface';
import { Evento } from '../../domain/entities/evento.entity';

import { CaslPrismaService } from '@app/common';

@Injectable()
export class PrismaEventoRepository implements IEventoRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly caslPrisma: CaslPrismaService
    ) { }

    async findAll(filter: any = {}, ability?: any): Promise<Evento[]> {
        const { tenantId, ...rest } = filter;
        let where: any = { ...rest, estado: { not: 'eliminado' } };
        if (tenantId) where.tenantId = tenantId;

        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Evento');
            where = { AND: [where, caslWhere] };
        }

        const records = await (this.prisma as any).evento.findMany({
            where,
            include: {
                tipo: true,
                tenant: true,
                camposExtras: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } },
                _count: {
                    select: { eventoInscripcions: true }
                },
                eventoInscripcions: {
                    where: { asistencia: true },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        return records.map((r: any) => {
            const inscritos = r._count?.eventoInscripcions || 0;
            const asistidos = r.eventoInscripcions?.length || 0;
            return this.map({ ...r, inscritos, asistidos });
        });
    }

    async findById(id: string, ability?: any): Promise<Evento | null> {
        let where: any = { id };
        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Evento');
            where = { AND: [where, caslWhere] };
        }

        const record = await (this.prisma as any).evento.findFirst({
            where,
            include: {
                tipo: true,
                tenant: true,
                camposExtras: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } },
                _count: {
                    select: { eventoInscripcions: true }
                },
                eventoInscripcions: {
                    where: { asistencia: true },
                    select: { id: true }
                },
                cuestionarios: {
                    where: { estado: { not: 'eliminado' } },
                    orderBy: { orden: 'asc' },
                    include: {
                        preguntas: {
                            where: { estado: { not: 'eliminado' } },
                            include: { opciones: { where: { estado: { not: 'eliminado' } } } },
                        },
                    },
                },
            },
        } as any);

        if (!record) return null;

        const inscritos = record._count?.eventoInscripcions || 0;
        const asistidos = record.eventoInscripcions?.length || 0;
        return this.map({ ...record, inscritos, asistidos });
    }

    async create(data: any, userId?: string): Promise<Evento> {
        const { inscritos, asistidos, camposExtras, ...cleanData } = data;

        // Limpiar metadatos
        const forbiddenWords = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'deletedBy', 'updatedBy'];
        forbiddenWords.forEach(pw => delete (cleanData as any)[pw]);

        const record = await (this.prisma as any).evento.create({
            data: {
                ...cleanData,
                createdBy: userId,
                camposExtras: camposExtras ? {
                    create: camposExtras.map((f: any) => ({
                        label: f.label,
                        tipo: f.tipo,
                        esObligatorio: f.esObligatorio,
                        orden: f.orden,
                        opciones: f.opciones || null
                    }))
                } : undefined
            },
            include: { tipo: true, tenant: true, camposExtras: true },
        });
        return this.map(record);
    }

    async update(id: string, data: any, userId?: string): Promise<Evento> {
        const { inscritos, asistidos, camposExtras, ...cleanData } = data;

        // Manejo de campos extras: 
        if (camposExtras) {
            // 1. Obtener existentes activos
            const existing = await (this.prisma as any).eventoCampoExtra.findMany({
                where: { eventoId: id, estado: { not: 'eliminado' } }
            });

            const toUpdate = camposExtras.filter((f: any) => f.id);
            const toCreate = camposExtras.filter((f: any) => !f.id);
            const toKeepIds = toUpdate.map((f: any) => f.id);
            const toDeleteIds = existing.filter((e: any) => !toKeepIds.includes(e.id)).map((e: any) => e.id);

            // Transacción para consistencia
            await (this.prisma as any).$transaction([
                // Eliminar los que no vienen (soft delete)
                ...(toDeleteIds.length > 0 ? [
                    (this.prisma as any).eventoCampoExtra.updateMany({
                        where: { id: { in: toDeleteIds } },
                        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId }
                    })
                ] : []),
                // Actualizar existentes
                ...toUpdate.map((f: any) => (
                    (this.prisma as any).eventoCampoExtra.update({
                        where: { id: f.id },
                        data: {
                            label: f.label,
                            tipo: f.tipo,
                            esObligatorio: f.esObligatorio,
                            opciones: f.opciones || null,
                            orden: f.orden
                        }
                    })
                )),
                // Crear nuevos
                ...(toCreate.length > 0 ? [
                    (this.prisma as any).eventoCampoExtra.createMany({
                        data: toCreate.map((f: any) => ({
                            ...f,
                            eventoId: id,
                            opciones: f.opciones || null,
                            estado: 'activo'
                        }))
                    })
                ] : [])
            ]);
        }

        // Evitar que campos de auditoría o fechas automáticas causen errores en el update
        const forbiddenWords = ['createdBy', 'createdAt', 'updatedAt', 'deletedAt', 'deletedBy', 'tenant', 'tipo'];
        forbiddenWords.forEach(pw => delete (cleanData as any)[pw]);

        const record = await (this.prisma as any).evento.update({
            where: { id },
            data: { ...cleanData, updatedBy: userId },
            include: {
                tipo: true,
                tenant: true,
                camposExtras: { where: { estado: { not: 'eliminado' } }, orderBy: { orden: 'asc' } }
            },
        });
        return this.map(record);
    }

    async delete(id: string, userId?: string): Promise<void> {
        await (this.prisma as any).evento.update({
            where: { id },
            data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
        });
    }

    private map(record: any): Evento {
        return new Evento(
            record.id,
            record.nombre || record.titulo,
            record.descripcion,
            record.codigo,
            record.modalidadIds,
            record.fecha,
            record.lugar,
            record.banner,
            record.afiche,
            record.tipoId,
            record.tenantId,
            record.codigoAsistencia,
            record.estado,
            record.tipo,
            record.tenant,
            record.inscritos || 0,
            record.asistidos || 0,
            record.camposExtras || []
        );
    }
}
