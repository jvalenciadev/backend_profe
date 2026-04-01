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
import {
  JwtAuthGuard,
  PoliciesGuard,
  CheckPolicies,
  Public,
} from '@app/common';
import {
  GetProvinciasUseCase,
  GetProvinciaByIdUseCase,
  CreateProvinciaUseCase,
  UpdateProvinciaUseCase,
  DeleteProvinciaUseCase,
} from '../../application/use-cases/provincia.use-cases';

@Controller('provincias')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProvinciaController {
  constructor(
    private readonly getProvinciasUseCase: GetProvinciasUseCase,
    private readonly getProvinciaByIdUseCase: GetProvinciaByIdUseCase,
    private readonly createProvinciaUseCase: CreateProvinciaUseCase,
    private readonly updateProvinciaUseCase: UpdateProvinciaUseCase,
    private readonly deleteProvinciaUseCase: DeleteProvinciaUseCase,
  ) {}

  @Get()
  @Public()
  findAll(@Query() query: any, @Req() req: any) {
    return this.getProvinciasUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getProvinciaByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Provincia'))
  create(@Body() data: any, @Req() req: any) {
    return this.createProvinciaUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Provincia'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProvinciaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Provincia'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateProvinciaUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Provincia'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteProvinciaUseCase.execute(id, req.user?.id, req.ability);
  }
}
