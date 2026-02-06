import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) { }

  async getLogs(tenantId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = BigInt(tenantId);

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: { user: true }
    });
    return this.serialize(logs);
  }

  async getVersions(resource: string, resourceId: string) {
    // Versions are stored within the 'details' of AuditLogs for UPDATE actions
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
        action: 'UPDATE'
      },
      orderBy: { timestamp: 'desc' }
    });
    return this.serialize(logs);
  }

  private serialize(obj: any) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }
}
