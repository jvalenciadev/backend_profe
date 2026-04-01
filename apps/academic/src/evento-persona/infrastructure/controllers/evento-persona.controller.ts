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
} from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetEventoPersonasUseCase,
  GetEventoPersonaByIdUseCase,
  CreateEventoPersonaUseCase,
  UpdateEventoPersonaUseCase,
  DeleteEventoPersonaUseCase,
} from '../../application/use-cases/evento-persona.use-cases';

@Controller('evento-persona')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventoPersonaController {
  constructor(
    private readonly getEventoPersonasUseCase: GetEventoPersonasUseCase,
    private readonly getEventoPersonaByIdUseCase: GetEventoPersonaByIdUseCase,
    private readonly createEventoPersonaUseCase: CreateEventoPersonaUseCase,
    private readonly updateEventoPersonaUseCase: UpdateEventoPersonaUseCase,
    private readonly deleteEventoPersonaUseCase: DeleteEventoPersonaUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EventoPersona'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEventoPersonasUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoPersona'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEventoPersonaByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EventoPersona'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEventoPersonaUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoPersona'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoPersonaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoPersona'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoPersonaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EventoPersona'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEventoPersonaUseCase.execute(
      id,
      req.user?.id,
      req.ability,
    );
  }
}
