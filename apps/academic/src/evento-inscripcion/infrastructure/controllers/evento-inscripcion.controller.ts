import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetEventoInscripcionsUseCase,
  GetEventoInscripcionByIdUseCase,
  CreateEventoInscripcionUseCase,
  UpdateEventoInscripcionUseCase,
  DeleteEventoInscripcionUseCase,
  GetEventoInscripcionStatsUseCase,
  ExportEventoInscripcionesUseCase,
} from '../../application/use-cases/evento-inscripcion.use-cases';

@Controller('eventos-inscripciones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventoInscripcionController {
  constructor(
    private readonly getEventoInscripcionsUseCase: GetEventoInscripcionsUseCase,
    private readonly getEventoInscripcionByIdUseCase: GetEventoInscripcionByIdUseCase,
    private readonly createEventoInscripcionUseCase: CreateEventoInscripcionUseCase,
    private readonly updateEventoInscripcionUseCase: UpdateEventoInscripcionUseCase,
    private readonly deleteEventoInscripcionUseCase: DeleteEventoInscripcionUseCase,
    private readonly getStatsUseCase: GetEventoInscripcionStatsUseCase,
    private readonly exportUseCase: ExportEventoInscripcionesUseCase,
  ) {}

  /**
   * GET /eventos-inscripciones
   * Retorna los últimos 100 inscritos (paginado).
   * Acepta ?search=CI_o_nombre para búsqueda server-side.
   * Acepta ?page=1&limit=100
   */
  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EventoInscripcion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEventoInscripcionsUseCase.execute(query, req.ability);
  }

  /**
   * GET /eventos-inscripciones/stats/:eventoId
   * Consulta rápida de estadísticas usando COUNT (no carga 50k registros).
   */
  @Get('stats/:eventoId')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoInscripcion'))
  getStats(@Param('eventoId') eventoId: string) {
    return this.getStatsUseCase.execute(eventoId);
  }

  /**
   * GET /eventos-inscripciones/export/:eventoId
   * Exporta TODOS los inscritos como JSON para generar Excel en frontend.
   * Solo devuelve campos esenciales para el Excel (sin joins pesados).
   */
  @Get('export/:eventoId')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoInscripcion'))
  async exportAll(
    @Param('eventoId') eventoId: string,
    @Req() req: any,
  ) {
    return this.exportUseCase.execute(eventoId, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoInscripcion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEventoInscripcionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EventoInscripcion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEventoInscripcionUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoInscripcion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoInscripcionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoInscripcion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoInscripcionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EventoInscripcion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEventoInscripcionUseCase.execute(id, req.user?.id, req.ability);
  }
}
