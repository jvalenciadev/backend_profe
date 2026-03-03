import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetEstadoInscripcionsUseCase, GetEstadoInscripcionByIdUseCase, CreateEstadoInscripcionUseCase, UpdateEstadoInscripcionUseCase, DeleteEstadoInscripcionUseCase
} from '../../application/use-cases/estado-inscripcion.use-cases';

@Controller('estados-inscripcion')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EstadoInscripcionController {
  constructor(
    private readonly getEstadoInscripcionsUseCase: GetEstadoInscripcionsUseCase,
    private readonly getEstadoInscripcionByIdUseCase: GetEstadoInscripcionByIdUseCase,
    private readonly createEstadoInscripcionUseCase: CreateEstadoInscripcionUseCase,
    private readonly updateEstadoInscripcionUseCase: UpdateEstadoInscripcionUseCase,
    private readonly deleteEstadoInscripcionUseCase: DeleteEstadoInscripcionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EstadoInscripcion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEstadoInscripcionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EstadoInscripcion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEstadoInscripcionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EstadoInscripcion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEstadoInscripcionUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EstadoInscripcion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEstadoInscripcionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EstadoInscripcion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEstadoInscripcionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EstadoInscripcion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEstadoInscripcionUseCase.execute(id, req.user?.id, req.ability);
  }
}