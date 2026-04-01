import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  IDepartamentoRepository,
  DepartamentoFilters,
} from '../../domain/repositories/departamento.repository.interface';
import { Departamento } from '../../domain/entities/departamento.entity';

@Injectable()
export class PrismaDepartamentoRepository implements IDepartamentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(record: any): Departamento {
    return new Departamento(
      record.id,
      record.nombre,
      record.abreviacion,
      record.estado,
    );
  }

  async create(data: Omit<Departamento, 'id'>): Promise<Departamento> {
    const record = await (this.prisma.departamento as any).create({ data });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<Departamento | null> {
    const record = await (this.prisma.departamento as any).findUnique({
      where: { id },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(
    filters: DepartamentoFilters = {},
  ): Promise<{ data: Departamento[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' }; // Assuming 'nombre' is generic

    const [total, data] = await Promise.all([
      (this.prisma.departamento as any).count({ where }),
      (this.prisma.departamento as any).findMany({
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

  async update(id: string, data: Partial<Departamento>): Promise<Departamento> {
    const record = await (this.prisma.departamento as any).update({
      where: { id },
      data,
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.departamento as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
