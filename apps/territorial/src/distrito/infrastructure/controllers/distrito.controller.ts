import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  PoliciesGuard,
  CheckPolicies,
  Public,
} from '@app/common';
import {
  GetDistritosUseCase,
  GetDistritoByIdUseCase,
} from '../../application/use-cases/get-distritos.use-case';
import { CreateDistritoUseCase } from '../../application/use-cases/create-distrito.use-case';
import {
  UpdateDistritoUseCase,
  DeleteDistritoUseCase,
} from '../../application/use-cases/update-distrito.use-case';

@Controller('distritos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DistritoController {
  constructor(
    private readonly getDistritosUseCase: GetDistritosUseCase,
    private readonly getDistritoByIdUseCase: GetDistritoByIdUseCase,
    private readonly createDistritoUseCase: CreateDistritoUseCase,
    private readonly updateDistritoUseCase: UpdateDistritoUseCase,
    private readonly deleteDistritoUseCase: DeleteDistritoUseCase,
  ) {}

  @Get()
  @Public()
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getDistritosUseCase.execute({
      search: query.search,
      estado: query.estado,
      page,
      limit,
    });
    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return await this.getDistritoByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Distrito'))
  async create(@Body() body: any) {
    return await this.createDistritoUseCase.execute(body);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Distrito'))
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.updateDistritoUseCase.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Distrito'))
  async remove(@Param('id') id: string) {
    await this.deleteDistritoUseCase.execute(id);
    return { message: 'Eliminado correctamente' };
  }
}
