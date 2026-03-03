import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetAsignacionFacilitadorsUseCase, GetAsignacionFacilitadorByIdUseCase, CreateAsignacionFacilitadorUseCase, UpdateAsignacionFacilitadorUseCase, DeleteAsignacionFacilitadorUseCase
} from '../../application/use-cases/asignacion-facilitador.use-cases';

@Controller('asignaciones-facilitadores')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AsignacionFacilitadorController {
  constructor(
    private readonly getAsignacionFacilitadorsUseCase: GetAsignacionFacilitadorsUseCase,
    private readonly getAsignacionFacilitadorByIdUseCase: GetAsignacionFacilitadorByIdUseCase,
    private readonly createAsignacionFacilitadorUseCase: CreateAsignacionFacilitadorUseCase,
    private readonly updateAsignacionFacilitadorUseCase: UpdateAsignacionFacilitadorUseCase,
    private readonly deleteAsignacionFacilitadorUseCase: DeleteAsignacionFacilitadorUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'AsignacionFacilitador'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getAsignacionFacilitadorsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'AsignacionFacilitador'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getAsignacionFacilitadorByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'AsignacionFacilitador'))
  create(@Body() data: any, @Req() req: any) {
    return this.createAsignacionFacilitadorUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'AsignacionFacilitador'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateAsignacionFacilitadorUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'AsignacionFacilitador'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateAsignacionFacilitadorUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'AsignacionFacilitador'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteAsignacionFacilitadorUseCase.execute(id, req.user?.id, req.ability);
  }
}