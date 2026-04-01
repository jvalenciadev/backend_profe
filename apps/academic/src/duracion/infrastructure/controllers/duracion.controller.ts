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
  GetDuracionsUseCase,
  GetDuracionByIdUseCase,
  CreateDuracionUseCase,
  UpdateDuracionUseCase,
  DeleteDuracionUseCase,
} from '../../application/use-cases/duracion.use-cases';

@Controller('duraciones')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DuracionController {
  constructor(
    private readonly getDuracionsUseCase: GetDuracionsUseCase,
    private readonly getDuracionByIdUseCase: GetDuracionByIdUseCase,
    private readonly createDuracionUseCase: CreateDuracionUseCase,
    private readonly updateDuracionUseCase: UpdateDuracionUseCase,
    private readonly deleteDuracionUseCase: DeleteDuracionUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaDuracion'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getDuracionsUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'ProgramaDuracion'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getDuracionByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'ProgramaDuracion'))
  create(@Body() data: any, @Req() req: any) {
    return this.createDuracionUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaDuracion'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateDuracionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'ProgramaDuracion'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateDuracionUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'ProgramaDuracion'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteDuracionUseCase.execute(id, req.user?.id, req.ability);
  }
}
