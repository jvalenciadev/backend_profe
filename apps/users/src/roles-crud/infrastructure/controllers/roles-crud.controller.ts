import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetRolesUseCase, GetRoleByIdUseCase, CreateRoleUseCase, UpdateRoleUseCase, DeleteRoleUseCase
} from '../../application/use-cases/roles-crud.use-cases';

@Controller('roles')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RolesCrudController {
  constructor(
    private readonly getRolesUseCase: GetRolesUseCase,
    private readonly getRoleByIdUseCase: GetRoleByIdUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) { }

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Role'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getRolesUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Role'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getRoleByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Role'))
  create(@Body() data: any, @Req() req: any) {
    return this.createRoleUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Role'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateRoleUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Role'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateRoleUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Role'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteRoleUseCase.execute(id, req.user?.id, req.ability);
  }
}