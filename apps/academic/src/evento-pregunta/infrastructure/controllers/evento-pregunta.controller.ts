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
  GetEventoPreguntasUseCase,
  GetEventoPreguntaByIdUseCase,
  CreateEventoPreguntaUseCase,
  UpdateEventoPreguntaUseCase,
  DeleteEventoPreguntaUseCase,
} from '../../application/use-cases/evento-pregunta.use-cases';

@Controller('evento-preguntas')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventoPreguntaController {
  constructor(
    private readonly getEventoPreguntasUseCase: GetEventoPreguntasUseCase,
    private readonly getEventoPreguntaByIdUseCase: GetEventoPreguntaByIdUseCase,
    private readonly createEventoPreguntaUseCase: CreateEventoPreguntaUseCase,
    private readonly updateEventoPreguntaUseCase: UpdateEventoPreguntaUseCase,
    private readonly deleteEventoPreguntaUseCase: DeleteEventoPreguntaUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EventoPregunta'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getEventoPreguntasUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EventoPregunta'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getEventoPreguntaByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EventoPregunta'))
  create(@Body() data: any, @Req() req: any) {
    return this.createEventoPreguntaUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoPregunta'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoPreguntaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EventoPregunta'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateEventoPreguntaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EventoPregunta'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteEventoPreguntaUseCase.execute(
      id,
      req.user?.id,
      req.ability,
    );
  }
}
