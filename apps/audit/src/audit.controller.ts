import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'AuditLog'))
  findAll(@Query('tenantId') queryTenantId: string, @Req() req: any) {
    const user = req.user;
    // Enforce user's tenantId if they are restricted to a department/tenant
    const tenantId = user?.tenantId || queryTenantId;
    return this.auditService.getLogs(tenantId);
  }

  @Get('versions/:resource/:id')
  @CheckPolicies((ability) => ability.can('read', 'AuditLog'))
  getVersions(@Param('resource') resource: string, @Param('id') id: string) {
    return this.auditService.getVersions(resource, id);
  }
}
