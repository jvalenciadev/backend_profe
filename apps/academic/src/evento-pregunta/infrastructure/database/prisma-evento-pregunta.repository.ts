import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IEventoPreguntaRepository } from '../../domain/repositories/evento-pregunta.repository.interface';

@Injectable()
export class PrismaEventoPreguntaRepository implements IEventoPreguntaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };
    // Assuming hasStatus internally
    const hasStatus = true;
    if (hasStatus) where.estado = { not: 'eliminado' };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'EventoPregunta',
      );
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).evento_pregunta.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { opciones: true },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'EventoPregunta',
      );
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).evento_pregunta.findFirst({
      where,
      include: { opciones: true },
    });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const { opciones, ...rest } = data;
    return await (this.prisma as any).evento_pregunta.create({
      data: {
        ...rest,
        createdBy: userId,
        opciones: opciones
          ? {
              create: opciones.map((opt: any) => ({
                texto: opt.texto,
                esCorrecta: opt.esCorrecta,
                createdBy: userId,
              })),
            }
          : undefined,
      },
      include: { opciones: true },
    });
  }

  async update(
    id: string,
    data: any,
    userId?: string,
    ability?: any,
  ): Promise<any> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'update',
        'EventoPregunta',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).evento_pregunta.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const { opciones, id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data;

    // Si hay opciones, las actualizamos (borramos y creamos para simplificar)
    if (opciones) {
      await (this.prisma as any).evento_opciones.deleteMany({
        where: { preguntaId: id },
      });
    }

    return await (this.prisma as any).evento_pregunta.update({
      where: { id },
      data: {
        ...rest,
        updatedBy: userId,
        opciones: opciones
          ? {
              create: opciones.map((opt: any) => ({
                texto: opt.texto,
                esCorrecta: opt.esCorrecta,
                createdBy: userId,
              })),
            }
          : undefined,
      },
      include: { opciones: true },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'delete',
        'EventoPregunta',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).evento_pregunta.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).evento_pregunta.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).evento_pregunta.delete({ where: { id } });
    }
  }
}
