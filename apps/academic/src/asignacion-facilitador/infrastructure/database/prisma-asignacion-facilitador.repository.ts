import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IAsignacionFacilitadorRepository } from '../../domain/repositories/asignacion-facilitador.repository.interface';

@Injectable()
export class PrismaAsignacionFacilitadorRepository implements IAsignacionFacilitadorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };

    // Mapping fields from frontend to Prisma model
    if (where.programaId) {
      where.programaDosId = where.programaId;
      delete where.programaId;
    }

    const hasStatus = true;
    if (hasStatus) where.estado = { not: 'eliminado' };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'AsignacionFacilitador',
      );
      where = { AND: [where, caslWhere] };
    }

    return await this.prisma.programaDosFacilitador.findMany({
      where,
      include: {
        facilitador: true,
        modulo: true,
        turno: {
          include: {
            turnoConfig: true,
          },
        },
        programaDos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'read',
        'AsignacionFacilitador',
      );
      where = { AND: [where, caslWhere] };
    }
    return await this.prisma.programaDosFacilitador.findFirst({ where });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const payload = { ...data };

    // Mapping fields
    if (payload.programaId) {
      payload.programaDosId = payload.programaId;
      delete payload.programaId;
    }

    return await this.prisma.programaDosFacilitador.create({
      data: { ...payload, createdBy: userId },
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
        'AsignacionFacilitador',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await this.prisma.programaDosFacilitador.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const payload = { ...data };
    if (payload.programaId) {
      payload.programaDosId = payload.programaId;
      delete payload.programaId;
    }

    return await this.prisma.programaDosFacilitador.update({
      where: { id },
      data: { ...payload, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'delete',
        'AsignacionFacilitador',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await this.prisma.programaDosFacilitador.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await this.prisma.programaDosFacilitador.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await this.prisma.programaDosFacilitador.delete({ where: { id } });
    }
  }
}
