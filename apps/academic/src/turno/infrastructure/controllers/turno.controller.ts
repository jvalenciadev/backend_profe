import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetTurnosUseCase, GetTurnoByIdUseCase, CreateTurnoUseCase, UpdateTurnoUseCase, DeleteTurnoUseCase
} from '../../application/use-cases/turno.use-cases';

@Controller('turnos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class TurnoController {
  constructor(
    private readonly getTurnosUseCase: GetTurnosUseCase,
    private readonly getTurnoByIdUseCase: GetTurnoByIdUseCase,
    private readonly createTurnoUseCase: CreateTurnoUseCase,
    private readonly updateTurnoUseCase: UpdateTurnoUseCase,
    private readonly deleteTurnoUseCase: DeleteTurnoUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaTurno'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getTurnosUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaTurno'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getTurnoByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaTurno'))
  create(@Body() data: any, @Req() req: any) {
    return this.createTurnoUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaTurno'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateTurnoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaTurno'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateTurnoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaTurno'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteTurnoUseCase.execute(id, req.user?.id, req.ability);
  }
}