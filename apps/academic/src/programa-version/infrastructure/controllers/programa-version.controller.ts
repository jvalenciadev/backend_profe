import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetProgramaVersionsUseCase, GetProgramaVersionByIdUseCase, CreateProgramaVersionUseCase, UpdateProgramaVersionUseCase, DeleteProgramaVersionUseCase
} from '../../application/use-cases/programa-version.use-cases';

@Controller('programa-versiones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProgramaVersionController {
  constructor(
    private readonly getProgramaVersionsUseCase: GetProgramaVersionsUseCase,
    private readonly getProgramaVersionByIdUseCase: GetProgramaVersionByIdUseCase,
    private readonly createProgramaVersionUseCase: CreateProgramaVersionUseCase,
    private readonly updateProgramaVersionUseCase: UpdateProgramaVersionUseCase,
    private readonly deleteProgramaVersionUseCase: DeleteProgramaVersionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaVersion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getProgramaVersionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaVersion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getProgramaVersionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaVersion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createProgramaVersionUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaVersion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProgramaVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaVersion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProgramaVersionUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaVersion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteProgramaVersionUseCase.execute(id, req.user?.id, req.ability);
  }
}