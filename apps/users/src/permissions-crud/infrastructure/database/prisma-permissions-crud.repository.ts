import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { type IPermissionRepository } from '../../domain/repositories/permissions-crud.repository.interface';

@Injectable()
export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findAll(filter: any = {}, ability?: any): Promise<any[]> {
    const { tenantId, search, ...rest } = filter;
    let where: any = { ...rest };
    const hasStatus = true;
    if (hasStatus) where.estado = { not: 'eliminado' };

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Permission');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).permission.findMany({
      where,
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Permission');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).permission.findFirst({ where });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const {
      id: _,
      createdAt: __,
      updatedAt: ___,
      rolePermissions: ____,
      guardName,
      ...restData
    } = data;
    return await (this.prisma as any).permission.create({
      data: {
        ...restData,
        guardName: guardName || 'web',
        createdBy: userId,
      },
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
        'Permission',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).permission.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const {
      id: _,
      createdAt: __,
      updatedAt: ___,
      rolePermissions: ____,
      ...restData
    } = data;
    return await (this.prisma as any).permission.update({
      where: { id },
      data: { ...restData, updatedBy: userId },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(
        ability,
        'delete',
        'Permission',
      );
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).permission.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).permission.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).permission.delete({ where: { id } });
    }
  }
}
