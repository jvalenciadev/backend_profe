import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { IProfeRepository, ProfeFilters } from '../../domain/repositories/profe.repository.interface';
import { Profe } from '../../domain/entities/profe.entity';

@Injectable()
export class PrismaProfeRepository implements IProfeRepository {
  constructor(private readonly prisma: PrismaService) { }

  private mapToDomain(record: any): Profe {
    return new Profe(
      record.id,
      record.nombre,
      record.nombreAbreviado,
      record.logoPrincipal,
      record.descripcion,
      record.mision,
      record.vision,
      record.sobreNosotros,
      record.actividad,
      record.fechaCreacion,
      record.ubicacion,
      record.correo,
      record.celular,
      record.telefono,
      record.pagina,
      record.facebook,
      record.tiktok,
      record.youtube,
      record.latitud ? Number(record.latitud) : null,
      record.longitud ? Number(record.longitud) : null,
      record.banner,
      record.afiche,
      record.convocatoria,
      record.imagen,
      record.color,
      record.colorSecundario,
      record.mantenimiento || false,
      record.estado,
    );
  }

  async create(data: Omit<Profe, 'id'>): Promise<Profe> {
    const record = await (this.prisma.profe as any).create({ data });
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<Profe | null> {
    const record = await (this.prisma.profe as any).findUnique({ where: { id } });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(filters: ProfeFilters = {}): Promise<{ data: Profe[]; total: number }> {
    const { search, estado, page = 1, limit = 20 } = filters;
    const where: any = { estado: { not: 'eliminado' } };
    if (estado && estado !== 'todos') where.estado = estado;
    if (search) where.nombre = { contains: search, mode: 'insensitive' }; // Assuming 'nombre' is generic

    const [total, data] = await Promise.all([
      (this.prisma.profe as any).count({ where }),
      (this.prisma.profe as any).findMany({
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

  async update(id: string, data: Partial<Profe>): Promise<Profe> {
    const record = await (this.prisma.profe as any).update({
      where: { id },
      data,
    });
    return this.mapToDomain(record);
  }

  async delete(id: string): Promise<boolean> {
    await (this.prisma.profe as any).update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
    return true;
  }
}
