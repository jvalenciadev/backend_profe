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
  GetGenerosUseCase,
  GetGeneroByIdUseCase,
  CreateGeneroUseCase,
  UpdateGeneroUseCase,
  DeleteGeneroUseCase,
} from '../../application/use-cases/generos-crud.use-cases';

@Controller('generos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class GeneroController {
  constructor(
    private readonly getGenerosUseCase: GetGenerosUseCase,
    private readonly getGeneroByIdUseCase: GetGeneroByIdUseCase,
    private readonly createGeneroUseCase: CreateGeneroUseCase,
    private readonly updateGeneroUseCase: UpdateGeneroUseCase,
    private readonly deleteGeneroUseCase: DeleteGeneroUseCase,
  ) {}

  @Get()
  @CheckPolicies((ability: any) => ability.can('read', 'Genero'))
  findAll(@Query() query: any, @Req() req: any) {
    return this.getGenerosUseCase.execute(query, req.ability);
  }

  @Get(':id')
  @CheckPolicies((ability: any) => ability.can('read', 'Genero'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.getGeneroByIdUseCase.execute(id, req.ability);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Genero'))
  create(@Body() data: any, @Req() req: any) {
    return this.createGeneroUseCase.execute(
      data,
      req.user?.id,
      req.user?.tenantId,
    );
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Genero'))
  updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateGeneroUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Patch(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Genero'))
  updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.updateGeneroUseCase.execute(
      id,
      data,
      req.user?.id,
      req.ability,
    );
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Genero'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deleteGeneroUseCase.execute(id, req.user?.id, req.ability);
  }
}
