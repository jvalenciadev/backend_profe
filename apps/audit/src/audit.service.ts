import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async getLogs(tenantId?: string, filters?: { action?: string; search?: string; page?: number; limit?: number }) {
    const { action, search, page = 1, limit = 50 } = filters || {};
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (action && action !== 'ALL') where.action = action.toUpperCase();
    if (search) {
      where.OR = [
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { apellidos: { contains: search, mode: 'insensitive' } },
              { correo: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, nombre: true, apellidos: true, correo: true, ci: true },
          },
        },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: this.serialize(logs), total, page: Number(page), limit: take };
  }

  async getVersions(resource: string, resourceId: string) {
    // Versions are stored within the 'details' of AuditLogs for UPDATE actions
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
        action: 'UPDATE',
      },
      orderBy: { timestamp: 'desc' },
    });
    return this.serialize(logs);
  }

  private serialize(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
