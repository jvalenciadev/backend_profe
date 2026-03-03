import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { GetProgramasUseCase, GetProgramaByIdUseCase } from '../../application/use-cases/get-programas.use-case';
import { CreateProgramaUseCase } from '../../application/use-cases/create-programa.use-case';
import { UpdateProgramaUseCase, DeleteProgramaUseCase } from '../../application/use-cases/update-programa.use-case';

@Controller('programas-maestros')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProgramaController {
  constructor(
    private readonly getProgramasUseCase: GetProgramasUseCase,
    private readonly getProgramaByIdUseCase: GetProgramaByIdUseCase,
    private readonly createProgramaUseCase: CreateProgramaUseCase,
    private readonly updateProgramaUseCase: UpdateProgramaUseCase,
    private readonly deleteProgramaUseCase: DeleteProgramaUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Programa'))
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getProgramasUseCase.execute({
      search: query.search,
      estado: query.estado,
      page,
      limit,
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Programa'))
  async findOne(@Param('id') id: string) {
    return await this.getProgramaByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Programa'))
  async create(@Body() body: any) {
    return await this.createProgramaUseCase.execute(body);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Programa'))
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.updateProgramaUseCase.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Programa'))
  async remove(@Param('id') id: string) {
    await this.deleteProgramaUseCase.execute(id);
    return { message: 'Eliminado correctamente' };
  }
}
