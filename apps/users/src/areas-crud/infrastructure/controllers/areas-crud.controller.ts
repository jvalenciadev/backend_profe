import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetAreasUseCase, GetAreaByIdUseCase, CreateAreaUseCase, UpdateAreaUseCase, DeleteAreaUseCase
} from '../../application/use-cases/areas-crud.use-cases';

@Controller('areas')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AreaController {
  constructor(
    private readonly getAreasUseCase: GetAreasUseCase,
    private readonly getAreaByIdUseCase: GetAreaByIdUseCase,
    private readonly createAreaUseCase: CreateAreaUseCase,
    private readonly updateAreaUseCase: UpdateAreaUseCase,
    private readonly deleteAreaUseCase: DeleteAreaUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Area'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getAreasUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Area'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getAreaByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Area'))
  create(@Body() data: any, @Req() req: any) {
    return this.createAreaUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Area'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateAreaUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Area'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateAreaUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Area'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteAreaUseCase.execute(id, req.user?.id, req.ability);
  }
}