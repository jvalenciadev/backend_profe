import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IEventoRepository } from '../../domain/repositories/evento.repository.interface';
import { Evento } from '../../domain/entities/evento.entity';

@Injectable()
export class PrismaEventoRepository implements IEventoRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(filter: any = {}, ability?: any): Promise<Evento[]> {
        const { tenantId, ...rest } = filter;
        const where: any = { ...rest, estado: { not: 'eliminado' } };
        if (tenantId) where.tenantId = tenantId;

        const records = await this.prisma.evento.findMany({
            where,
            include: { tipo: true, tenant: true },
            orderBy: { createdAt: 'desc' },
        });
        return records.map((r) => this.map(r));
    }

    async findById(id: string): Promise<Evento | null> {
        const record = await this.prisma.evento.findFirst({
            where: { id },
            include: {
                tipo: true,
                tenant: true,
                cuestionarios: {
                    where: { estado: { not: 'eliminado' } },
                    include: {
                        preguntas: {
                            where: { estado: { not: 'eliminado' } },
                            include: { opciones: { where: { estado: { not: 'eliminado' } } } },
                        },
                    },
                },
            },
        } as any);
        return record ? this.map(record) : null;
    }

    async create(data: any, userId?: string): Promise<Evento> {
        const record = await (this.prisma as any).evento.create({
            data: { ...data, createdBy: userId },
            include: { tipo: true, tenant: true },
        });
        return this.map(record);
    }

    async update(id: string, data: any, userId?: string): Promise<Evento> {
        const record = await (this.prisma as any).evento.update({
            where: { id },
            data: { ...data, updatedBy: userId },
            include: { tipo: true, tenant: true },
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
        return new Evento(record.id, record.titulo, record.descripcion, record.fecha, record.tipoId, record.tenantId, record.estado, record.tipo, record.tenant);
    }
}
