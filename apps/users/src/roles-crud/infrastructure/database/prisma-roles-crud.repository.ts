import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { type IRoleRepository } from '../../domain/repositories/roles-crud.repository.interface';

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
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
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Role');
      where = { AND: [where, caslWhere] };
    }

    return await (this.prisma as any).role.findMany({
      where,
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async findById(id: string, ability?: any): Promise<any | null> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'Role');
      where = { AND: [where, caslWhere] };
    }
    return await (this.prisma as any).role.findFirst({
      where,
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async create(
    data: any,
    userId?: string,
    forcedTenantId?: string,
  ): Promise<any> {
    const {
      permissions,
      id: _,
      createdAt: __,
      updatedAt: ___,
      rolePermissions: ____,
      ...roleData
    } = data;
    return await (this.prisma as any).role.create({
      data: {
        ...roleData,
        createdBy: userId,
        rolePermissions: permissions
          ? {
              create: permissions.map((pId: string) => ({ permissionId: pId })),
            }
          : undefined,
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
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'Role');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).role.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para editar este registro o no existe',
      );

    const {
      permissions,
      id: _,
      createdAt: __,
      updatedAt: ___,
      rolePermissions: ____,
      ...roleData
    } = data;
    return await (this.prisma as any).role.update({
      where: { id },
      data: {
        ...roleData,
        updatedBy: userId,
        rolePermissions: permissions
          ? {
              deleteMany: {},
              create: permissions.map((pId: string) => ({ permissionId: pId })),
            }
          : undefined,
      },
    });
  }

  async delete(id: string, userId?: string, ability?: any): Promise<void> {
    let where: any = { id };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'delete', 'Role');
      where = { AND: [where, caslWhere] };
    }
    const exists = await (this.prisma as any).role.findFirst({ where });
    if (!exists)
      throw new Error(
        'No tiene permisos para eliminar este registro o no existe',
      );

    const hasStatus = true;
    if (hasStatus) {
      await (this.prisma as any).role.update({
        where: { id },
        data: { estado: 'eliminado', deletedAt: new Date(), deletedBy: userId },
      });
    } else {
      await (this.prisma as any).role.delete({ where: { id } });
    }
  }
}
