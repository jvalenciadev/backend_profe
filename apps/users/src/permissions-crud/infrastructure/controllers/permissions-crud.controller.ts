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
  GetPermissionsUseCase,
  GetPermissionByIdUseCase,
  CreatePermissionUseCase,
  UpdatePermissionUseCase,
  DeletePermissionUseCase,
} from '../../application/use-cases/permissions-crud.use-cases';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PermissionsCrudController {
  constructor(
    private readonly getPermissionsUseCase: GetPermissionsUseCase,
    private readonly getPermissionByIdUseCase: GetPermissionByIdUseCase,
    private readonly createPermissionUseCase: CreatePermissionUseCase,
    private readonly updatePermissionUseCase: UpdatePermissionUseCase,
    private readonly deletePermissionUseCase: DeletePermissionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Permission'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getPermissionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Permission'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getPermissionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Permission'))
  create(@Body() data: any, @Req() req: any) {
    return this.createPermissionUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Permission'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updatePermissionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Permission'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updatePermissionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Permission'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deletePermissionUseCase.execute(id, req.user?.id, req.ability);
  }
}
