import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import type { IEvaluacionPeriodoRepository, EvaluacionPeriodoFilters } from '../../domain/repositories/evaluacionPeriodo.repository.interface';
import { EvaluacionPeriodo } from '../../domain/entities/evaluacionPeriodo.entity';

@Injectable()
export class PrismaEvaluacionPeriodoRepository implements IEvaluacionPeriodoRepository {
  constructor(private readonly prisma: PrismaService) { }

  private mapToDomain(record: any): EvaluacionPeriodo {
    return new EvaluacionPeriodo(
      record.id,
      record.periodo,
      record.gestion,
      record.semestre,
      record.activo,
      record.estado,
    );
  }

  async create(data: any): Promise<EvaluacionPeriodo> {
    const { criterios, ...rest } = data;
    const record = await (this.prisma.evaluacionPeriodo as any).create({
      data: {
        ...rest,
        estado: 'activo',
        criterios: criterios ? {
          create: criterios.map((c: any) => ({
            nombre: c.nombre,
            puntajeMaximo: c.puntajeMaximo,
            orden: c.orden
          }))
        } : undefined
      }
    });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<EvaluacionPeriodo | null> {
    const record = await (this.prisma.evaluacionPeriodo as any).findUnique({ where: { id } });
    return record ? this.mapToDomain(record) : null;
  }

  async findActiveOverlap(gestion: string, semestre: string): Promise<EvaluacionPeriodo | null> {
    const record = await (this.prisma.evaluacionPeriodo as any).findFirst({
      where: {
        gestion,
        semestre,
        estado: { not: 'eliminado' }
      }
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(filters: EvaluacionPeriodoFilters = {}): Promise<{ data: EvaluacionPeriodo[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' }; // Assuming 'nombre' is generic

    const [total, data] = await Promise.all([
      (this.prisma.evaluacionPeriodo as any).count({ where }),
      (this.prisma.evaluacionPeriodo as any).findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
    ]);

    return {
      data: data.map((item: any) => this.mapToDomain(item)),
      total,
    };
  }

  async update(id: string, data: Partial<EvaluacionPeriodo>): Promise<EvaluacionPeriodo> {
    const record = await (this.prisma.evaluacionPeriodo as any).update({
      where: { id },
      data,
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.evaluacionPeriodo as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
