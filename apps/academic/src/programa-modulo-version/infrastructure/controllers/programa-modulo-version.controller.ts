import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetProgramaModuloVersionsUseCase, GetProgramaModuloVersionByIdUseCase, CreateProgramaModuloVersionUseCase, UpdateProgramaModuloVersionUseCase, DeleteProgramaModuloVersionUseCase
} from '../../application/use-cases/programa-modulo-version.use-cases';

@Controller('programa-modulo-versiones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProgramaModuloVersionController {
  constructor(
    private readonly getProgramaModuloVersionsUseCase: GetProgramaModuloVersionsUseCase,
    private readonly getProgramaModuloVersionByIdUseCase: GetProgramaModuloVersionByIdUseCase,
    private readonly createProgramaModuloVersionUseCase: CreateProgramaModuloVersionUseCase,
    private readonly updateProgramaModuloVersionUseCase: UpdateProgramaModuloVersionUseCase,
    private readonly deleteProgramaModuloVersionUseCase: DeleteProgramaModuloVersionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaModuloVersion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getProgramaModuloVersionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaModuloVersion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getProgramaModuloVersionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaModuloVersion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createProgramaModuloVersionUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaModuloVersion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProgramaModuloVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaModuloVersion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProgramaModuloVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaModuloVersion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteProgramaModuloVersionUseCase.execute(id, req.user?.id, req.ability);
  }
}