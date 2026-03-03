import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetEventoTiposUseCase, GetEventoTipoByIdUseCase, CreateEventoTipoUseCase, UpdateEventoTipoUseCase, DeleteEventoTipoUseCase
} from '../../application/use-cases/evento-tipo.use-cases';

@Controller('tipos-evento')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventoTipoController {
  constructor(
    private readonly getEventoTiposUseCase: GetEventoTiposUseCase,
    private readonly getEventoTipoByIdUseCase: GetEventoTipoByIdUseCase,
    private readonly createEventoTipoUseCase: CreateEventoTipoUseCase,
    private readonly updateEventoTipoUseCase: UpdateEventoTipoUseCase,
    private readonly deleteEventoTipoUseCase: DeleteEventoTipoUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EventoTipo'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEventoTiposUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoTipo'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEventoTipoByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EventoTipo'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEventoTipoUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoTipo'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoTipoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoTipo'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoTipoUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EventoTipo'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEventoTipoUseCase.execute(id, req.user?.id, req.ability);
  }
}