import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetOfertasUseCase, GetOfertaByIdUseCase } from '../../application/use-cases/get-ofertas.use-case';

@Controller('ofertas-clean')
export class OfertaController {
    constructor(
        private readonly getOfertasUseCase: GetOfertasUseCase,
        private readonly getOfertaByIdUseCase: GetOfertaByIdUseCase,
    ) { }

    @Get()
    findAll(@Query() query: any) {
        return this.getOfertasUseCase.execute(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.getOfertaByIdUseCase.execute(id);
    }
}
