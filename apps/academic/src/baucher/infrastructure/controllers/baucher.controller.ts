import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import {
  GetBauchersUseCase, GetBaucherByIdUseCase, CreateBaucherUseCase, UpdateBaucherUseCase, DeleteBaucherUseCase
} from '../../application/use-cases/baucher.use-cases';

@Controller('bauchers')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BaucherController {
  constructor(
    private readonly getBauchersUseCase: GetBauchersUseCase,
    private readonly getBaucherByIdUseCase: GetBaucherByIdUseCase,
    private readonly createBaucherUseCase: CreateBaucherUseCase,
    private readonly updateBaucherUseCase: UpdateBaucherUseCase,
    private readonly deleteBaucherUseCase: DeleteBaucherUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Baucher'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getBauchersUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Baucher'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getBaucherByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Baucher'))
  create(@Body() data: any, @Req() req: any) {
    return this.createBaucherUseCase.execute(data, req.user?.id, req.user?.tenantId);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Baucher'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateBaucherUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Baucher'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateBaucherUseCase.execute(id, data, req.user?.id, req.ability);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Baucher'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteBaucherUseCase.execute(id, req.user?.id, req.ability);
  }
}