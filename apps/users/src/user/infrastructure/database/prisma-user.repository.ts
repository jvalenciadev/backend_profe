import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';
import { type IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

const USER_INCLUDE = {
  roles: {
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
    },
  },
  sedes: { include: { sede: true } },
  tenant: true,
  cargoPostulacion: true,
  bp_posgrado: { include: { bp_tipo_posgrado: true } },
  bp_produccion_intelectual: true,
  mod_campos_extra_regs: { include: { campoExtra: true } },
} as const;

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslPrisma: CaslPrismaService,
  ) {}

  async findById(id: string, ability?: any): Promise<User | null> {
    const where: any = { id, estado: { not: 'eliminado' } };
    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'User');
      const user = await this.prisma.user.findFirst({
        where: { AND: [caslWhere, where] },
        include: USER_INCLUDE,
      });
      return user ? new User(user) : null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
    return user ? new User(user) : null;
  }

  async findAll(filter: any = {}): Promise<User[]> {
    const { ability, search, ...rest } = filter;
    let where: any = { ...rest, estado: { not: 'eliminado' } };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellidos: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { correo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'read', 'User');
      where = { AND: [caslWhere, where] };
    }

    // Filtro senior: Excluir participantes y estudiantes de la lista general del dashboard
    // para que solo se vean administradores, gestores, etc.
    where = {
      AND: [
        where,
        {
          roles: {
            none: {
              role: {
                name: {
                  in: ['PARTICIPANTE', 'ESTUDIANTE'],
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    };

    const users = await this.prisma.user.findMany({
      where,
      include: USER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => new User(u));
  }

  async create(data: any): Promise<User> {
    const { roles, sedes, ...userData } = data;
    const created = await this.prisma.user.create({
      data: {
        ...userData,
        roles: roles
          ? {
              create: roles.map((roleId: string) => ({
                roleId,
                modelType: 'App\\User',
              })),
            }
          : undefined,
        sedes: sedes
          ? { create: sedes.map((sedeId: string) => ({ sedeId })) }
          : undefined,
        mod_campos_extra_regs: data.mod_campos_extra_regs
          ? {
              create: Object.entries(data.mod_campos_extra_regs).map(
                ([campoExtraId, valor]: [string, any]) => ({
                  campoExtraId,
                  valor: String(valor),
                }),
              ),
            }
          : undefined,
      },
      include: USER_INCLUDE,
    });
    return new User(created);
  }

  async update(id: string, data: any, ability?: any): Promise<User> {
    const { roles, sedes, ...userData } = data;

    if (ability) {
      const caslWhere = this.caslPrisma.getWhere(ability, 'update', 'User');
      const target = await this.prisma.user.findFirst({
        where: { AND: [caslWhere, { id }] },
      });
      if (!target)
        throw new Error('No tiene permisos para actualizar este usuario');
    }

    const updateData: any = { ...userData };
    if (roles !== undefined) {
      updateData.roles = {
        deleteMany: {},
        create: roles.map((roleId: string) => ({
          roleId,
          modelType: 'App\\User',
        })),
      };
    }
    if (sedes !== undefined) {
      updateData.sedes = {
        deleteMany: {},
        create: sedes.map((sedeId: string) => ({ sedeId })),
      };
    }
    if (data.mod_campos_extra_regs !== undefined) {
      updateData.mod_campos_extra_regs = {
        deleteMany: {},
        create: Object.entries(data.mod_campos_extra_regs).map(
          ([campoExtraId, valor]: [string, any]) => ({
            campoExtraId,
            valor: String(valor),
          }),
        ),
      };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: USER_INCLUDE,
    });
    return new User(updated);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        estado: 'eliminado',
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { correo: email },
    });
    return user ? new User(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? new User(user) : null;
  }

  async getRawToken(id: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { resetPasswordToken: true },
    });
    return user?.resetPasswordToken ?? null;
  }
}
