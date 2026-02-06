import { Controller, Get, Query, Param } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get('logs')
  findAll(@Query('tenantId') tenantId: string) {
    return this.auditService.getLogs(tenantId);
  }

  @Get('versions/:resource/:id')
  getVersions(@Param('resource') resource: string, @Param('id') id: string) {
    return this.auditService.getVersions(resource, id);
  }
}
