import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetTiposUseCase, GetTipoByIdUseCase, CreateTipoUseCase, UpdateTipoUseCase, DeleteTipoUseCase
} from '../../application/use-cases/tipo.use-cases';

@Controller('tipos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class TipoController {
  constructor(
    private readonly getTiposUseCase: GetTiposUseCase,
    private readonly getTipoByIdUseCase: GetTipoByIdUseCase,
    private readonly createTipoUseCase: CreateTipoUseCase,
    private readonly updateTipoUseCase: UpdateTipoUseCase,
    private readonly deleteTipoUseCase: DeleteTipoUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Tipo'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getTiposUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Tipo'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getTipoByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Tipo'))
  create(@Body() data: any, @Req() req: any) {
    return this.createTipoUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Tipo'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateTipoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Tipo'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateTipoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Tipo'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteTipoUseCase.execute(id, req.user?.id, req.ability);
  }
}