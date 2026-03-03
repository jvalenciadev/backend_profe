import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query, Res, Patch, Logger } from '@nestjs/common';
import { JwtAuthGuard, Public } from '@app/common';
import {
    CreatePeriodoUseCase,
    GetPeriodosUseCase,
    GetPeriodoByIdUseCase,
    TogglePeriodoUseCase,
    DeletePeriodoUseCase,
} from '../../application/use-cases/periodo.use-cases';
import {
    CreateEvaluacionUseCase,
    GetEvaluacionesUseCase,
    GetEvaluacionByIdUseCase,
    GetMyEvaluacionesUseCase,
    VerifyEvaluacionCodeUseCase,
    GetUsersToEvaluateUseCase,
} from '../../application/use-cases/evaluacion.use-cases';
import { GeneratePDFUseCase } from '../../application/use-cases/generate-pdf.use-case';

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
    private readonly logger = new Logger(EvaluationsController.name);

    constructor(
        private readonly createPeriodoUseCase: CreatePeriodoUseCase,
        private readonly getPeriodosUseCase: GetPeriodosUseCase,
        private readonly getPeriodoByIdUseCase: GetPeriodoByIdUseCase,
        private readonly togglePeriodoUseCase: TogglePeriodoUseCase,
        private readonly deletePeriodoUseCase: DeletePeriodoUseCase,
        private readonly createEvaluacionUseCase: CreateEvaluacionUseCase,
        private readonly getEvaluacionesUseCase: GetEvaluacionesUseCase,
        private readonly getEvaluacionByIdUseCase: GetEvaluacionByIdUseCase,
        private readonly getMyEvaluacionesUseCase: GetMyEvaluacionesUseCase,
        private readonly verifyCodeUseCase: VerifyEvaluacionCodeUseCase,
        private readonly getUsersToEvaluateUseCase: GetUsersToEvaluateUseCase,
        private readonly generatePDFUseCase: GeneratePDFUseCase,
    ) { }

    // ── PERÍODOS ─────────────────────────────────────────────────

    @Post('periodos')
    async createPeriodo(@Body() data: any) {
        return this.createPeriodoUseCase.execute(data);
    }

    @Get('periodos')
    async findPeriodos() {
        return this.getPeriodosUseCase.execute();
    }

    @Get('periodos/:id')
    async findPeriodo(@Param('id') id: string) {
        return this.getPeriodoByIdUseCase.execute(id);
    }

    @Patch('periodos/:id/toggle')
    async togglePeriodo(@Param('id') id: string, @Body('activo') activo: boolean) {
        return this.togglePeriodoUseCase.execute(id, activo);
    }

    @Delete('periodos/:id')
    async deletePeriodo(@Param('id') id: string) {
        return this.deletePeriodoUseCase.execute(id);
    }

    // ── EVALUACIONES ──────────────────────────────────────────────

    @Get('eligibles')
    async findEligibles(@Req() req: any, @Query('periodoId') periodoId: string, @Query('tenantId') forcedTenantId?: string) {
        const tenantId = forcedTenantId || req.user.tenantId;
        return this.getUsersToEvaluateUseCase.execute(tenantId, periodoId);
    }

    @Get('usuarios')
    async findUsuarios(@Req() req: any, @Query('periodoId') pId: string, @Query('tenantId') tId?: string) {
        return this.getUsersToEvaluateUseCase.execute(tId || req.user.tenantId, pId);
    }

    @Get('my/all')
    async findMyEvaluations(@Req() req: any) {
        return this.getMyEvaluacionesUseCase.execute(req.user.id);
    }

    @Get()
    async findEvaluaciones(@Req() req: any, @Query('periodoId') periodoId?: string) {
        return this.getEvaluacionesUseCase.execute(req.user.tenantId, periodoId);
    }

    @Get('pdf/:id')
    async getPdf(@Param('id') id: string, @Res() res: any) {
        try {
            const buffer = await this.generatePDFUseCase.execute(id);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="hoja_de_concepto_${id}.pdf"`,
                'Content-Length': buffer.length,
            });
            res.end(buffer);
        } catch (error) {
            this.logger.error(`Error generating PDF for ${id}: ${error.message}`);
            res.status(500).json({ success: false, message: 'No se pudo generar el PDF' });
        }
    }

    @Get(':id/pdf')
    async getPdfAlias(@Param('id') id: string, @Res() res: any) {
        return this.getPdf(id, res);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.getEvaluacionByIdUseCase.execute(id);
    }

    @Post()
    async createEvaluation(@Body() body: any, @Req() req: any) {
        this.logger.log(`POST /evaluations body: ${JSON.stringify(body)}`);
        const { responsableTenantId, ...data } = body;
        return this.createEvaluacionUseCase.execute(data, responsableTenantId, req.user.id);
    }

    @Public()
    @Get('verify/:code')
    async verifyCode(@Param('code') code: string) {
        return this.verifyCodeUseCase.execute(code);
    }
}
