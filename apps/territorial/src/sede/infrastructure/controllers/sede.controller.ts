import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { GetSedesUseCase, GetSedeByIdUseCase } from '../../application/use-cases/get-sedes.use-case';
import { CreateSedeUseCase } from '../../application/use-cases/create-sede.use-case';
import { UpdateSedeUseCase, DeleteSedeUseCase } from '../../application/use-cases/update-sede.use-case';

@Controller('sedes')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SedeController {
  constructor(
    private readonly getSedesUseCase: GetSedesUseCase,
    private readonly getSedeByIdUseCase: GetSedeByIdUseCase,
    private readonly createSedeUseCase: CreateSedeUseCase,
    private readonly updateSedeUseCase: UpdateSedeUseCase,
    private readonly deleteSedeUseCase: DeleteSedeUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Sede'))
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getSedesUseCase.execute({
      search: query.search,
      estado: query.estado,
      page,
      limit,
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Sede'))
  async findOne(@Param('id') id: string) {
    return await this.getSedeByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Sede'))
  async create(@Body() body: any) {
    return await this.createSedeUseCase.execute(body);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Sede'))
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.updateSedeUseCase.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Sede'))
  async remove(@Param('id') id: string) {
    await this.deleteSedeUseCase.execute(id);
    return { message: 'Eliminado correctamente' };
  }
}
