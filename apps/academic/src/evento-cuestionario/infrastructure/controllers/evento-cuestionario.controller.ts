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
  GetEventoCuestionariosUseCase,
  GetEventoCuestionarioByIdUseCase,
  CreateEventoCuestionarioUseCase,
  UpdateEventoCuestionarioUseCase,
  DeleteEventoCuestionarioUseCase,
  GetEventoProgressUseCase,
} from '../../application/use-cases/evento-cuestionario.use-cases';

@Controller('evento-cuestionarios')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventoCuestionarioController {
  constructor(
    private readonly getEventoCuestionariosUseCase: GetEventoCuestionariosUseCase,
    private readonly getEventoCuestionarioByIdUseCase: GetEventoCuestionarioByIdUseCase,
    private readonly createEventoCuestionarioUseCase: CreateEventoCuestionarioUseCase,
    private readonly updateEventoCuestionarioUseCase: UpdateEventoCuestionarioUseCase,
    private readonly deleteEventoCuestionarioUseCase: DeleteEventoCuestionarioUseCase,
    private readonly getEventoProgressUseCase: GetEventoProgressUseCase,
  ) {}

  @Get('progress/:eventoId/:personaId')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoCuestionario'))
  findProgress(
    @Param('eventoId') eventoId: string,
    @Param('personaId') personaId: string,
  ) {
    return this.getEventoProgressUseCase.execute(eventoId, personaId);
  }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EventoCuestionario'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEventoCuestionariosUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoCuestionario'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEventoCuestionarioByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EventoCuestionario'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEventoCuestionarioUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoCuestionario'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoCuestionarioUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoCuestionario'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoCuestionarioUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EventoCuestionario'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEventoCuestionarioUseCase.execute(
      id,
      req.user?.id,
      req.ability,
    );
  }
}
