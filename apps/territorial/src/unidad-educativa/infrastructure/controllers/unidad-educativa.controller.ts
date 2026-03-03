import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies, Public } from '@app/common';
import { GetUnidadesEducativasUseCase, GetUnidadEducativaByIdUseCase } from '../../application/use-cases/get-unidades-educativas.use-case';
import { CreateUnidadEducativaUseCase, UpdateUnidadEducativaUseCase, DeleteUnidadEducativaUseCase } from '../../application/use-cases/crud-unidad-educativa.use-case';

@Controller('unidades-educativas')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UnidadEducativaController {
    constructor(
        private readonly getUseCase: GetUnidadesEducativasUseCase,
        private readonly getByIdUseCase: GetUnidadEducativaByIdUseCase,
        private readonly createUseCase: CreateUnidadEducativaUseCase,
        private readonly updateUseCase: UpdateUnidadEducativaUseCase,
        private readonly deleteUseCase: DeleteUnidadEducativaUseCase,
    ) { }

    @Get()
    @Public()
    async findAll(@Query() query: any) {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 100;
        const result = await this.getUseCase.execute({
            search: query.search,
            estado: query.estado,
            distritoId: query.distritoId,
            page,
            limit,
        });
        return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
    }

    @Get(':id')
    @Public()
    async findOne(@Param('id') id: string) {
        return await this.getByIdUseCase.execute(id);
    }

    @Post()
    @CheckPolicies((ability: any) => ability.can('create', 'UnidadEducativa'))
    async create(@Body() body: any) {
        return await this.createUseCase.execute(body);
    }

    @Put(':id')
    @CheckPolicies((ability: any) => ability.can('update', 'UnidadEducativa'))
    async update(@Param('id') id: string, @Body() body: any) {
        return await this.updateUseCase.execute(id, body);
    }

    @Delete(':id')
    @CheckPolicies((ability: any) => ability.can('delete', 'UnidadEducativa'))
    async remove(@Param('id') id: string) {
        await this.deleteUseCase.execute(id);
        return { message: 'Eliminada correctamente' };
    }
}
