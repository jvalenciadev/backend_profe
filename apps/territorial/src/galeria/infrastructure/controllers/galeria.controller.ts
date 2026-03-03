import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetGaleriasUseCase, GetGaleriaByIdUseCase, CreateGaleriaUseCase, UpdateGaleriaUseCase, DeleteGaleriaUseCase
} from '../../application/use-cases/galeria.use-cases';

@Controller('galerias')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class GaleriaController {
  constructor(
    private readonly getGaleriasUseCase: GetGaleriasUseCase,
    private readonly getGaleriaByIdUseCase: GetGaleriaByIdUseCase,
    private readonly createGaleriaUseCase: CreateGaleriaUseCase,
    private readonly updateGaleriaUseCase: UpdateGaleriaUseCase,
    private readonly deleteGaleriaUseCase: DeleteGaleriaUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Galeria'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getGaleriasUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Galeria'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getGaleriaByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Galeria'))
  create(@Body() data: any, @Req() req: any) {
    return this.createGaleriaUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Galeria'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateGaleriaUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Galeria'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateGaleriaUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Galeria'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteGaleriaUseCase.execute(id, req.user?.id, req.ability);
  }
}