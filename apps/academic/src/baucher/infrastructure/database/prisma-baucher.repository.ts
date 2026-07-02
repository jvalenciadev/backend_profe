import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { IBaucherRepository } from '../../domain/repositories/baucher.repository.interface';

@Injectable()
export class PrismaBaucherRepository implements IBaucherRepository {
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
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Baucher');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).programaBaucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Baucher');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).programaBaucher.findFirst({ where });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const preparedData = { ...data };
    if (
      preparedData.nroDeposito !== undefined &&
      preparedData.nroDeposito !== null
    ) {
      preparedData.nroDeposito = BigInt(
        String(preparedData.nroDeposito).replace(/\D/g, ''),
      );
    }
    if (preparedData.monto !== undefined) {
      preparedData.monto = parseInt(String(preparedData.monto), 10);
    }
    if (preparedData.fecha) {
      preparedData.fecha = new Date(preparedData.fecha);
    }
    return await (this.prisma as any).programaBaucher.create({
      data: { ...preparedData, createdBy: userId },
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
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'Baucher');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).programaBaucher.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const preparedData = { ...data };
    if (
      preparedData.nroDeposito !== undefined &&
      preparedData.nroDeposito !== null
    ) {
      preparedData.nroDeposito = BigInt(
        String(preparedData.nroDeposito).replace(/\D/g, ''),
      );
    }
    if (preparedData.monto !== undefined) {
      preparedData.monto = parseInt(String(preparedData.monto), 10);
    }
    if (preparedData.fecha) {
      preparedData.fecha = new Date(preparedData.fecha);
    }

    return await (this.prisma as any).programaBaucher.update({
      where: { id },
      data: { ...preparedData, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'Baucher');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).programaBaucher.findFirst({
      where,
    });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).programaBaucher.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).programaBaucher.delete({ where: { id } });
    }
  }
}
