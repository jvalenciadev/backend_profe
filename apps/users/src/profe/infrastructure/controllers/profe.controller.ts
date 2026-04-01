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
  CurrentUser,
  Public,
} from '@app/common';
import {
  GetProfesUseCase,
  GetProfeByIdUseCase,
} from '../../application/use-cases/get-profes.use-case';
import { CreateProfeUseCase } from '../../application/use-cases/create-profe.use-case';
import {
  UpdateProfeUseCase,
  DeleteProfeUseCase,
} from '../../application/use-cases/update-profe.use-case';
import { CreateProfeDto } from '../../application/dto/create-profe.dto';
import { UpdateProfeDto } from '../../application/dto/update-profe.dto';

@Controller('profe')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProfeController {
  constructor(
    private readonly getProfesUseCase: GetProfesUseCase,
    private readonly getProfeByIdUseCase: GetProfeByIdUseCase,
    private readonly createProfeUseCase: CreateProfeUseCase,
    private readonly updateProfeUseCase: UpdateProfeUseCase,
    private readonly deleteProfeUseCase: DeleteProfeUseCase,
  ) {}

  @Get()
  @Public()
  async findAll(@Query() query: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const result = await this.getProfesUseCase.execute({
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
    return await this.getProfeByIdUseCase.execute(id);
  }

  @Post()
  @CheckPolicies((ability: any) => ability.can('create', 'Profe'))
  async create(@Body() dto: CreateProfeDto, @CurrentUser() user: any) {
    return await this.createProfeUseCase.execute(dto, user.id);
  }

  @Put(':id')
  @CheckPolicies((ability: any) => ability.can('update', 'Profe'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProfeDto,
    @CurrentUser() user: any,
  ) {
    return await this.updateProfeUseCase.execute(id, dto, user.id);
  }

  @Delete(':id')
  @CheckPolicies((ability: any) => ability.can('delete', 'Profe'))
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.deleteProfeUseCase.execute(id, user.id);
    return { message: 'Eliminado correctamente' };
  }
}
