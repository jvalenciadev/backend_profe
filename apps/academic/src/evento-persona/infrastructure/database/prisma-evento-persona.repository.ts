import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IEventoPersonaRepository } from '../../domain/repositories/evento-persona.repository.interface';

@Injectable()
export class PrismaEventoPersonaRepository implements IEventoPersonaRepository {
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
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoPersona');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).eventoPersona.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'EventoPersona');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).eventoPersona.findFirst({ where });
  }

  async create(data: any, userId?: string, forcedTenantId?: string): Promise<any> {
    return await (this.prisma as any).eventoPersona.create({
      data: { ...data, createdBy: userId }
    });
  }

  async update(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'EventoPersona');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoPersona.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para editar este registro o no existe');

    return await (this.prisma as any).eventoPersona.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'EventoPersona');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).eventoPersona.findFirst({ where });
    if (!exists) throw new Error('No tiene permisos para eliminar este registro o no existe');

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).eventoPersona.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).eventoPersona.delete({ where: { id } });
    }
  }
}