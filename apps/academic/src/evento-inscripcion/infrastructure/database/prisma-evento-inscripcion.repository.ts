import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IEventoInscripcionRepository } from '../../domain/repositories/evento-inscripcion.repository.interface';

@Injectable()
export class PrismaEventoInscripcionRepository implements IEventoInscripcionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) { }

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };

    // Siempre filtrar los eliminados
    where.estado = { not: 'eliminado' };

    if (search) {
      const isNumeric = !isNaN(Number(search)) && search.trim() !== '';
      where = {
        ...where,
        OR: [
          { persona: { nombre1: { contains: search, mode: 'insensitive' } } },
          { persona: { apellido1: { contains: search, mode: 'insensitive' } } },
          ...(isNumeric ? [{ persona: { ci: { equals: BigInt(search) } } }] : [])
        ]
      };
    }

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).eventoInscripcion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        persona: {
          include: {
            eventoCuestionarioIntentos: true
          }
        },
        respuestasExtras: {
          include: {
            campoExtra: true
          }
        }
      }
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoInscripcion');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).eventoInscripcion.findFirst({
      where,
      include: {
        persona: true
      }
    });
  }

  async create(data: any, userId?: string, forcedTenantId?: string): Promise<any> {
    const { respuestasExtras, ...cleanData } = data;
    return await (this.prisma as any).eventoInscripcion.create({
      data: {
        ...cleanData,
        createdBy: userId,
        respuestasExtras: respuestasExtras ? {
          create: respuestasExtras.map((r: any) => ({
            campoExtraId: r.campoExtraId,
            valor: String(r.valor)
          }))
        } : undefined
      },
      include: {
        persona: true,
        respuestasExtras: { include: { campoExtra: true } }
      }
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

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).eventoInscripcion.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).eventoInscripcion.delete({ where: { id } });
    }
  }
}