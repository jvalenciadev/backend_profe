import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { GetEvaluacionPeriodosUseCase, GetEvaluacionPeriodoByIdUseCase } from '../../application/use-cases/get-evaluacionPeriodos.use-case';
import { CreateEvaluacionPeriodoUseCase } from '../../application/use-cases/create-evaluacionPeriodo.use-case';
import { UpdateEvaluacionPeriodoUseCase, DeleteEvaluacionPeriodoUseCase } from '../../application/use-cases/update-evaluacionPeriodo.use-case';

@Controller('evaluacion-periodos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EvaluacionPeriodoController {
  constructor(
    private readonly getEvaluacionPeriodosUseCase: GetEvaluacionPeriodosUseCase,
    private readonly getEvaluacionPeriodoByIdUseCase: GetEvaluacionPeriodoByIdUseCase,
    private readonly createEvaluacionPeriodoUseCase: CreateEvaluacionPeriodoUseCase,
    private readonly updateEvaluacionPeriodoUseCase: UpdateEvaluacionPeriodoUseCase,
    private readonly deleteEvaluacionPeriodoUseCase: DeleteEvaluacionPeriodoUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'EvaluacionPeriodo'))
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getEvaluacionPeriodosUseCase.execute({
      search: query.search,
      estado: query.estado,
      page,
      limit,
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'EvaluacionPeriodo'))
  async findOne(@Param('id') id: string) {
    return await this.getEvaluacionPeriodoByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'EvaluacionPeriodo'))
  async create(@Body() body: any) {
    return await this.createEvaluacionPeriodoUseCase.execute(body);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'EvaluacionPeriodo'))
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.updateEvaluacionPeriodoUseCase.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'EvaluacionPeriodo'))
  async remove(@Param('id') id: string) {
    await this.deleteEvaluacionPeriodoUseCase.execute(id);
    return { message: 'Eliminado correctamente' };
  }
}
