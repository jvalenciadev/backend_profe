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
  GetCalificacionsUseCase,
  GetCalificacionByIdUseCase,
  CreateCalificacionUseCase,
  UpdateCalificacionUseCase,
  DeleteCalificacionUseCase,
} from '../../application/use-cases/calificacion.use-cases';

@Controller('calificaciones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CalificacionController {
  constructor(
    private readonly getCalificacionsUseCase: GetCalificacionsUseCase,
    private readonly getCalificacionByIdUseCase: GetCalificacionByIdUseCase,
    private readonly createCalificacionUseCase: CreateCalificacionUseCase,
    private readonly updateCalificacionUseCase: UpdateCalificacionUseCase,
    private readonly deleteCalificacionUseCase: DeleteCalificacionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Calificacion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getCalificacionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Calificacion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getCalificacionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Calificacion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createCalificacionUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Calificacion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateCalificacionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Calificacion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateCalificacionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Calificacion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteCalificacionUseCase.execute(
      id,
      req.user?.id,
      req.ability,
    );
  }
}
