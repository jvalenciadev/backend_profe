import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IBlogRepository } from '../../domain/repositories/blog.repository.interface';
import { Blog } from '../../domain/entities/blog.entity';

@Injectable()
export class PrismaBlogRepository implements IBlogRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly caslPrisma: CaslPrismaService,
    ) { }

    async findAll(filter: any = {}, ability?: any): Promise<Blog[]> {
        const { tenantId, search, ...rest } = filter;
        let where: any = { ...rest, estado: { not: 'eliminado' } };

        if (tenantId) where.tenantId = tenantId;
        if (search) {
            where.OR = [
                { titulo: { contains: search, mode: 'insensitive' } },
                { descripcion: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Blog');
            where = { AND: [where, caslWhere] };
        }

        const records = await this.prisma.blog.findMany({
            where,
            include: { tenant: true },
            orderBy: { createdAt: 'desc' },
        });
        return records.map(r => this.map(r));
    }

    async findById(id: string, ability?: any): Promise<Blog | null> {
        let where: any = { id, estado: { not: 'eliminado' } };
        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Blog');
            where = { AND: [where, caslWhere] };
        }

        const record = await this.prisma.blog.findFirst({
            where,
            include: { tenant: true },
        });
        return record ? this.map(record) : null;
    }

    async create(data: any, userId?: string, forcedTenantId?: string): Promise<Blog> {
        const { tenantId, ...blogData } = data;
        const finalTenantId = forcedTenantId || tenantId;

        const record = await this.prisma.blog.create({
            data: {
                ...blogData,
                estado: blogData.estado?.toLowerCase() || 'activo',
                tenantId: finalTenantId,
                createdBy: userId,
                updatedBy: userId,
            },
            include: { tenant: true },
        });
        return this.map(record);
    }

    async update(id: string, data: any, userId?: string, ability?: any): Promise<Blog> {
        let where: any = { id };
        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'Blog');
            where = { AND: [where, caslWhere] };
        }

        const exists = await this.prisma.blog.findFirst({ where });
        if (!exists) throw new Error('No tiene permisos para editar este registro o no existe');

        const { tenantId, ...updData } = data;
        const record = await this.prisma.blog.update({
            where: { id },
            data: {
                ...updData,
                estado: updData.estado?.toLowerCase(),
                updatedBy: userId
            },
            include: { tenant: true },
        });
        return this.map(record);
    }

    async delete(id: string, userId?: string, ability?: any): Promise<void> {
        let where: any = { id };
        if (ability) {
            const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'Blog');
            where = { AND: [where, caslWhere] };
        }

        const exists = await this.prisma.blog.findFirst({ where });
        if (!exists) throw new Error('No tiene permisos para eliminar este registro o no existe');

        await this.prisma.blog.update({
            where: { id },
            data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
        });
    }

    private map(record: any): Blog {
        return new Blog(
            record.id, record.titulo, record.descripcion, record.fecha, record.imagenes,
            record.tipo, record.tenantId, record.estado, record.createdAt, record.updatedAt,
            record.createdBy, record.updatedBy, record.deletedBy, record.tenant
        );
    }
}
