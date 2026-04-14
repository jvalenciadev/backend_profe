import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IEventoInscripcionRepository } from '../../domain/repositories/evento-inscripcion.repository.interface';

@Injectable()
export class PrismaEventoInscripcionRepository implements IEventoInscripcionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  /**
   * findAll — paginado server-side.
   * Sin búsqueda: devuelve los últimos 100 inscritos (rápido).
   * Con búsqueda por CI/nombre: busca en toda la tabla y devuelve resultados.
   */
  async findAll(filter: any = {}, ability?: any): Promise<any> {
    const { tenantId, search, page, limit, exportAll, ...rest } = filter;
    const take = exportAll ? undefined : (Number(limit) || 100);
    const skip = exportAll ? undefined : ((Number(page) - 1 || 0) * take!);

    let where: any = { ...rest };
    where.estado = { not: 'eliminado' };

    if (search && search.trim() !== '') {
      const s = search.trim();
      const isNumeric = /^\d+$/.test(s);
      where = {
        ...where,
        OR: [
          { persona: { nombre: { contains: s, mode: 'insensitive' } } },
          { persona: { apellidos: { contains: s, mode: 'insensitive' } } },
          ...(isNumeric ? [{ persona: { ci: { equals: BigInt(s) } } }] : []),
        ],
      };
    }

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }

    const include = {
      persona: {
        include: {
          eventoCuestionarioIntentos: exportAll ? true : {
            select: { id: true, cuestionarioId: true, estado: true },
          },
        },
      },
      respuestasExtras: {
        include: { campoExtra: true },
      },
    };

    const [data, total] = await Promise.all([
      (this.prisma as any).eventoInscripcion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include,
      }),
      (this.prisma as any).eventoInscripcion.count({ where }),
    ]);

    return { data, total, page: Number(page) || 1, limit: take };
  }

  /**
   * getStats — consulta ultra rápida de estadísticas usando COUNT y GROUP BY.
   * No carga registros completos, solo conteos.
   */
  async getStats(eventoId: string): Promise<any> {
    const [total, conAsistencia, porCampoExtra] = await Promise.all([
      (this.prisma as any).eventoInscripcion.count({
        where: { eventoId, estado: { not: 'eliminado' } },
      }),
      (this.prisma as any).eventoInscripcion.count({
        where: { eventoId, estado: { not: 'eliminado' }, asistencia: true },
      }),
      // Stats de campos extra: agrupar por valor
      (this.prisma as any).eventoCampoExtraRespuesta.groupBy({
        by: ['campoExtraId', 'valor'],
        where: {
          inscripcion: { eventoId, estado: { not: 'eliminado' } },
        },
        _count: { valor: true },
        orderBy: { _count: { valor: 'desc' } },
      }),
    ]);

    return {
      total,
      conAsistencia,
      sinAsistencia: total - conAsistencia,
      porcentajeAsistencia: total > 0 ? Math.round((conAsistencia / total) * 100) : 0,
      porCampoExtra,
    };
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).eventoInscripcion.findFirst({
      where,
      include: { persona: true },
    });
  }

  async create(data: any, userId?: string, forcedTenantId?: string): Promise<any> {
    const { respuestasExtras, ...cleanData } = data;
    return await (this.prisma as any).eventoInscripcion.create({
      data: {
        ...cleanData,
        createdBy: userId,
        respuestasExtras: respuestasExtras
          ? {
              create: respuestasExtras.map((r: any) => ({
                campoExtraId: r.campoExtraId,
                valor: String(r.valor),
              })),
            }
          : undefined,
      },
      include: {
        persona: true,
        respuestasExtras: { include: { campoExtra: true } },
      },
    });
  }

  async update(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoInscripcion.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para editar este registro o no existe');

    return await (this.prisma as any).eventoInscripcion.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoInscripcion.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para eliminar este registro o no existe');

    await (this.prisma as any).eventoInscripcion.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
    });
  }
}
