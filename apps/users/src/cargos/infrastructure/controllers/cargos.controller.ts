import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { GetCargosUseCase, GetCargoByIdUseCase } from '../../application/use-cases/get-cargos.use-case';
import { CreateCargoUseCase } from '../../application/use-cases/create-cargo.use-case';
import { UpdateCargoUseCase, DeleteCargoUseCase } from '../../application/use-cases/update-cargo.use-case';

@Controller('cargos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CargosController {
    constructor(
        private readonly getCargosUseCase: GetCargosUseCase,
        private readonly getCargoByIdUseCase: GetCargoByIdUseCase,
        private readonly createCargoUseCase: CreateCargoUseCase,
        private readonly updateCargoUseCase: UpdateCargoUseCase,
        private readonly deleteCargoUseCase: DeleteCargoUseCase,
    ) { }

    @Get()
    @CheckPolicies((ability) => ability.can('read', 'Cargo'))
    async findAll(@Query() query: any, @Req() req: any) {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 20;

        const result = await this.getCargosUseCase.execute({
            search: query.search,
            estado: query.estado,
            page,
            limit,
        }, req.ability);

        return {
            data: result.data,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        };
    }

    @Get(':id')
    @CheckPolicies((ability) => ability.can('read', 'Cargo'))
    async findOne(@Param('id') id: string) {
        return await this.getCargoByIdUseCase.execute(id);
    }

    @Post()
    @CheckPolicies((ability) => ability.can('create', 'Cargo'))
    async create(@Body() body: any) {
        return await this.createCargoUseCase.execute({
            nombre: body.nombre,
            estado: body.estado,
            createdBy: body.user?.id // si tienes interceptor o request.user
        });
    }

    @Put(':id')
    @CheckPolicies((ability) => ability.can('update', 'Cargo'))
    async update(@Param('id') id: string, @Body() body: any) {
        return await this.updateCargoUseCase.execute(id, body);
    }

    @Delete(':id')
    @CheckPolicies((ability) => ability.can('delete', 'Cargo'))
    async remove(@Param('id') id: string) {
        await this.deleteCargoUseCase.execute(id);
        return { message: 'Eliminado correctamente' };
    }
}
