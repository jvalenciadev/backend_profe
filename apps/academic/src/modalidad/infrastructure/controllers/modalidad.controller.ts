import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetModalidadsUseCase, GetModalidadByIdUseCase, CreateModalidadUseCase, UpdateModalidadUseCase, DeleteModalidadUseCase
} from '../../application/use-cases/modalidad.use-cases';

@Controller('modalidades')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ModalidadController {
  constructor(
    private readonly getModalidadsUseCase: GetModalidadsUseCase,
    private readonly getModalidadByIdUseCase: GetModalidadByIdUseCase,
    private readonly createModalidadUseCase: CreateModalidadUseCase,
    private readonly updateModalidadUseCase: UpdateModalidadUseCase,
    private readonly deleteModalidadUseCase: DeleteModalidadUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaModalidad'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getModalidadsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaModalidad'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getModalidadByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaModalidad'))
  create(@Body() data: any, @Req() req: any) {
    return this.createModalidadUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaModalidad'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateModalidadUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaModalidad'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateModalidadUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaModalidad'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteModalidadUseCase.execute(id, req.user?.id, req.ability);
  }
}