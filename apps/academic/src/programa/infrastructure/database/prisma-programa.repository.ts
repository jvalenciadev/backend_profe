import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import type { IProgramaRepository, ProgramaFilters } from '../../domain/repositories/programa.repository.interface';
import { Programa } from '../../domain/entities/programa.entity';

@Injectable()
export class PrismaProgramaRepository implements IProgramaRepository {
  constructor(private readonly prisma: PrismaService) { }

  private mapToDomain(record: any): Programa {
    return new Programa(
      record.id,
      record.nombre,
      record.codigo,
      record.fechaInicioInscripcion,
      record.fechaFinInscripcion,
      record.fechaInicioClases,
      record.estado,
      record.nombreAbreviado,
      record.contenido,
      record.horario,
      record.cargaHoraria,
      record.costo,
      record.banner,
      record.afiche,
      record.convocatoria,
      record.duracionId,
      record.tipoId,
      record.modalidadId,
      record.modulos,
    );
  }

  async create(data: any): Promise<Programa> {
    const { modulos, nombreAbre, ...rest } = data;

    // Auto-fill mandatory dates if missing
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

    const record = await (this.prisma.programa as any).create({
      data: {
        ...rest,
        estado: (data.estado || 'activo').toLowerCase(),
        nombreAbreviado: nombreAbre || rest.nombreAbreviado,
        fechaInicioInscripcion: rest.fechaInicioInscripcion || now,
        fechaFinInscripcion: rest.fechaFinInscripcion || future,
        fechaInicioClases: rest.fechaInicioClases || future,
        modulos: modulos && Array.isArray(modulos) ? {
          create: modulos.map(({ id, ...m }: any) => ({
            ...m,
            notaMinima: Number(m.notaMinima) || 69,
            estado: (m.estado || 'activo').toLowerCase()
          }))
        } : undefined
      },
      include: { modulos: true }
    });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<Programa | null> {
    const record = await (this.prisma.programa as any).findUnique({
      where: { id },
      include: { modulos: true }
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(filters: ProgramaFilters = {}): Promise<{ data: Programa[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado.toLowerCase();
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      (this.prisma.programa as any).count({ where }),
      (this.prisma.programa as any).findMany({
        where,
        include: { modulos: true },
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

  async update(id: string, data: any): Promise<Programa> {
    const { modulos, nombreAbre, ...rest } = data;
    const updateData: any = {
      ...rest,
      nombreAbreviado: nombreAbre || rest.nombreAbreviado
    };

    if (data.estado) updateData.estado = data.estado.toLowerCase();

    if (modulos && Array.isArray(modulos)) {
      updateData.modulos = {
        deleteMany: {},
        create: modulos.map(({ id, createdAt, updatedAt, programaId, ...m }: any) => ({
          ...m,
          notaMinima: Number(m.notaMinima) || 69,
          estado: (m.estado || 'activo').toLowerCase()
        }))
      };
    }

    const record = await (this.prisma.programa as any).update({
      where: { id },
      data: updateData,
      include: { modulos: true }
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.programa as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
