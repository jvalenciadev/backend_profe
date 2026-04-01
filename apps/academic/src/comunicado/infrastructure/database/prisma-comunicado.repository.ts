import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  IComunicadoRepository,
  ComunicadoFilters,
} from '../../domain/repositories/comunicado.repository.interface';
import { Comunicado } from '../../domain/entities/comunicado.entity';

import { CaslPrismaService } from '@app/common';

@Injectable()
export class PrismaComunicadoRepository implements IComunicadoRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  private mapToDomain(record: any): Comunicado {
    const entity = new Comunicado(
      record.id,
      record.imagen,
      record.nombre,
      record.descripcion,
      record.importancia,
      record.estado,
      record.tenantId,
    );
    // Campos adicionales para el frontend
    (entity as any).tenant = record.tenant;
    (entity as any).createdAt = record.createdAt;
    (entity as any).tipo = record.tipo;
    (entity as any).updatedAt = record.updatedAt;
    return entity;
  }

  async create(data: any): Promise<Comunicado> {
    const {
      id: _,
      tenant: __,
      createdAt: ___,
      updatedAt: ____,
      ...rest
    } = data;
    if (rest.estado) rest.estado = rest.estado.toLowerCase();
    const record = await (this.prisma.comunicado as any).create({
      data: rest,
    });
    return this.mapToDomain(record);
  }

  async findById(id: string, ability?: any): Promise<Comunicado | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Comunicado');
      where = { AND: [where, caslWhere] };
    }
    const record = await (this.prisma.comunicado as any).findFirst({
      where,
      include: { tenant: true },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(
    filters: ComunicadoFilters = {},
    ability?: any,
  ): Promise<{ data: Comunicado[]; total: number }> {
    const { search, estado, page = 1, limit = 20, tenantId } = filters;
    let where: any = { estado: { not: 'eliminado' } };

    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' };
    if (tenantId) where.tenantId = tenantId;

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Comunicado');
      where = { AND: [where, caslWhere] };
    }

    const [total, data] = await Promise.all([
      (this.prisma.comunicado as any).count({ where }),
      (this.prisma.comunicado as any).findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data.map((item: any) => this.mapToDomain(item)),
      total,
    };
  }

  async update(id: string, data: any): Promise<Comunicado> {
    const {
      id: _,
      tenant: __,
      createdAt: ___,
      updatedAt: ____,
      ...rest
    } = data;
    if (rest.estado) rest.estado = rest.estado.toLowerCase();
    const record = await (this.prisma.comunicado as any).update({
      where: { id },
      data: rest,
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.comunicado as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
