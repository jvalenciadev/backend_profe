import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies, CurrentUser } from '@app/common';
import { GetComunicadosUseCase, GetComunicadoByIdUseCase } from '../../application/use-cases/get-comunicados.use-case';
import { CreateComunicadoUseCase } from '../../application/use-cases/create-comunicado.use-case';
import { UpdateComunicadoUseCase, DeleteComunicadoUseCase } from '../../application/use-cases/update-comunicado.use-case';
import { CreateComunicadoDto } from '../../application/dto/create-comunicado.dto';
import { UpdateComunicadoDto } from '../../application/dto/update-comunicado.dto';

@Controller('comunicados')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ComunicadoController {
  constructor(
    private readonly getComunicadosUseCase: GetComunicadosUseCase,
    private readonly getComunicadoByIdUseCase: GetComunicadoByIdUseCase,
    private readonly createComunicadoUseCase: CreateComunicadoUseCase,
    private readonly updateComunicadoUseCase: UpdateComunicadoUseCase,
    private readonly deleteComunicadoUseCase: DeleteComunicadoUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Comunicado'))
  async findAll(@Query() query: any, @Req() req: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;

    const result = await this.getComunicadosUseCase.execute(
      {
        search: query.search,
        estado: query.estado,
        page,
        limit,
      },
      req.ability
    );
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Comunicado'))
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.getComunicadoByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Comunicado'))
  async create(@Body() dto: CreateComunicadoDto, @CurrentUser() user: any) {
    const isAdmin = user.roles?.some((r: any) => r.role?.name === 'ADMINISTRADOR');
    // Para administradores permitiremos el tenantId que envíen, sino forzamos el suyo
    const tenantId = isAdmin ? dto.tenantId : user.tenantId;
    return await this.createComunicadoUseCase.execute(dto, user.id, tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Comunicado'))
  async update(@Param('id') id: string, @Body() dto: UpdateComunicadoDto, @CurrentUser() user: any) {
    return await this.updateComunicadoUseCase.execute(id, dto, user.id);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Comunicado'))
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.deleteComunicadoUseCase.execute(id, user.id);
    return { message: 'Eliminado correctamente' };
  }
}
