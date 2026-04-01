import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  IDistritoRepository,
  DistritoFilters,
} from '../../domain/repositories/distrito.repository.interface';
import { Distrito } from '../../domain/entities/distrito.entity';

@Injectable()
export class PrismaDistritoRepository implements IDistritoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(record: any): Distrito {
    return new Distrito(
      record.id,
      record.codigo,
      record.nombre,
      record.estado,
      record.departamentoId,
    );
  }

  async create(data: Omit<Distrito, 'id'>): Promise<Distrito> {
    const record = await (this.prisma.distrito as any).create({ data });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<Distrito | null> {
    const record = await (this.prisma.distrito as any).findUnique({
      where: { id },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(
    filters: DistritoFilters = {},
  ): Promise<{ data: Distrito[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' }; // Assuming 'nombre' is generic

    const [total, data] = await Promise.all([
      (this.prisma.distrito as any).count({ where }),
      (this.prisma.distrito as any).findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: data.map((item: any) => this.mapToDomain(item)),
      total,
    };
  }

  async update(id: string, data: Partial<Distrito>): Promise<Distrito> {
    const record = await (this.prisma.distrito as any).update({
      where: { id },
      data,
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.distrito as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
