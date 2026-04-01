import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  IUnidadEducativaRepository,
  UnidadEducativaFilters,
} from '../../domain/repositories/unidad-educativa.repository.interface';
import { UnidadEducativa } from '../../domain/entities/unidad-educativa.entity';

@Injectable()
export class PrismaUnidadEducativaRepository implements IUnidadEducativaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(record: any): UnidadEducativa {
    const codigoNum = record.codigo ? Number(record.codigo) : 0;
    const entity = new UnidadEducativa(
      record.id,
      codigoNum,
      record.nombre,
      record.estado,
      record.distritoId,
    );
    // Alias para compatibilidad con el frontend que usa 'codigoSie'
    (entity as any).codigoSie = codigoNum;
    (entity as any).distrito = record.distrito;
    (entity as any).createdAt = record.createdAt;
    return entity;
  }

  async create(data: any): Promise<UnidadEducativa> {
    const { id: _, distrito: __, codigoSie: ___, ...rest } = data;
    if (rest.codigo !== undefined) rest.codigo = BigInt(rest.codigo);
    const record = await (this.prisma.unidad_educativa as any).create({
      data: rest,
      include: { distrito: true },
    });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<UnidadEducativa | null> {
    const record = await (this.prisma.unidad_educativa as any).findUnique({
      where: { id },
      include: { distrito: true },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(
    filters: UnidadEducativaFilters = {},
  ): Promise<{ data: UnidadEducativa[]; total: number }> {
    const { search, estado, distritoId, page = 1, limit = 100 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (distritoId) where.distritoId = distritoId;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: isNaN(Number(search)) ? undefined : BigInt(search) },
      ].filter(Boolean);
    }

    const [total, data] = await Promise.all([
      (this.prisma.unidad_educativa as any).count({ where }),
      (this.prisma.unidad_educativa as any).findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { distrito: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    return {
      data: data.map((item: any) => this.mapToDomain(item)),
      total,
    };
  }

  async update(id: string, data: any): Promise<UnidadEducativa> {
    const {
      id: _,
      distrito: __,
      createdAt: ___,
      updatedAt: ____,
      ...rest
    } = data;
    if (rest.codigo) rest.codigo = BigInt(rest.codigo);
    const record = await (this.prisma.unidad_educativa as any).update({
      where: { id },
      data: rest,
      include: { distrito: true },
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.unidad_educativa as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
