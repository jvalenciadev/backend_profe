import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetVersionsUseCase, GetVersionByIdUseCase, CreateVersionUseCase, UpdateVersionUseCase, DeleteVersionUseCase
} from '../../application/use-cases/version.use-cases';

@Controller('versiones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class VersionController {
  constructor(
    private readonly getVersionsUseCase: GetVersionsUseCase,
    private readonly getVersionByIdUseCase: GetVersionByIdUseCase,
    private readonly createVersionUseCase: CreateVersionUseCase,
    private readonly updateVersionUseCase: UpdateVersionUseCase,
    private readonly deleteVersionUseCase: DeleteVersionUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaVersion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getVersionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaVersion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getVersionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaVersion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createVersionUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaVersion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaVersion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaVersion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteVersionUseCase.execute(id, req.user?.id, req.ability);
  }
}