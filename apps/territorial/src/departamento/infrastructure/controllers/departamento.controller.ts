import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies, Public } from '@app/common';
import { GetDepartamentosUseCase, GetDepartamentoByIdUseCase } from '../../application/use-cases/get-departamentos.use-case';
import { CreateDepartamentoUseCase } from '../../application/use-cases/create-departamento.use-case';
import { UpdateDepartamentoUseCase, DeleteDepartamentoUseCase } from '../../application/use-cases/update-departamento.use-case';

@Controller('departamentos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DepartamentoController {
  constructor(
    private readonly getDepartamentosUseCase: GetDepartamentosUseCase,
    private readonly getDepartamentoByIdUseCase: GetDepartamentoByIdUseCase,
    private readonly createDepartamentoUseCase: CreateDepartamentoUseCase,
    private readonly updateDepartamentoUseCase: UpdateDepartamentoUseCase,
    private readonly deleteDepartamentoUseCase: DeleteDepartamentoUseCase,
  ) { }

  @Get()
  @Public()
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getDepartamentosUseCase.execute({
      search: query.search,
      estado: query.estado,
      page,
      limit,
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return await this.getDepartamentoByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Departamento'))
  async create(@Body() body: any) {
    return await this.createDepartamentoUseCase.execute(body);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Departamento'))
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.updateDepartamentoUseCase.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Departamento'))
  async remove(@Param('id') id: string) {
    await this.deleteDepartamentoUseCase.execute(id);
    return { message: 'Eliminado correctamente' };
  }
}
