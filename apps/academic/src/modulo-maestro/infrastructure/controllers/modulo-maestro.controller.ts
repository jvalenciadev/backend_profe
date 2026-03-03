import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetModuloMaestrosUseCase, GetModuloMaestroByIdUseCase, CreateModuloMaestroUseCase, UpdateModuloMaestroUseCase, DeleteModuloMaestroUseCase
} from '../../application/use-cases/modulo-maestro.use-cases';

@Controller('modulos-maestros')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ModuloMaestroController {
  constructor(
    private readonly getModuloMaestrosUseCase: GetModuloMaestrosUseCase,
    private readonly getModuloMaestroByIdUseCase: GetModuloMaestroByIdUseCase,
    private readonly createModuloMaestroUseCase: CreateModuloMaestroUseCase,
    private readonly updateModuloMaestroUseCase: UpdateModuloMaestroUseCase,
    private readonly deleteModuloMaestroUseCase: DeleteModuloMaestroUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ModuloMaestro'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getModuloMaestrosUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ModuloMaestro'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getModuloMaestroByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ModuloMaestro'))
  create(@Body() data: any, @Req() req: any) {
    return this.createModuloMaestroUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ModuloMaestro'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateModuloMaestroUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ModuloMaestro'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateModuloMaestroUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ModuloMaestro'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteModuloMaestroUseCase.execute(id, req.user?.id, req.ability);
  }
}