import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard, CheckPolicies } from '@app/common';
import { GetOfertasUseCase, GetOfertaByIdUseCase } from '../../application/use-cases/get-ofertas.use-case';

@Controller('ofertas-clean')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OfertaController {
    constructor(
        private readonly getOfertasUseCase: GetOfertasUseCase,
        private readonly getOfertaByIdUseCase: GetOfertaByIdUseCase,
    ) { }

    @Get()
    @CheckPolicies((ability: any) => ability.can('read', 'ProgramaDos'))
    findAll(@Query() query: any, @Req() req: any) {
        return this.getOfertasUseCase.execute(query, req.ability);
    }

    @Get(':id')
    @CheckPolicies((ability: any) => ability.can('read', 'ProgramaDos'))
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.getOfertaByIdUseCase.execute(id, req.ability);
    }
}
