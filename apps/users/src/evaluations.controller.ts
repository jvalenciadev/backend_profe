import { Controller, Post, Body, Get, Param, Res, Query } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import type { Response } from 'express';

@Controller('evaluations')
export class EvaluationsController {
    constructor(private readonly evaluationsService: EvaluationsService) { }

    @Post()
    async create(@Body() data: any) {
        return this.evaluationsService.createEvaluation(data);
    }

    @Get('admins')
    async getAdmins(@Query('role') role: string) {
        if (role) {
            return this.evaluationsService.getAdminsByRole(role);
        }
        return this.evaluationsService.getAdminsByRole('admin'); // Default or all?
    }

    @Get('pdf/:id')
    async downloadPdf(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.evaluationsService.generatePDF(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=evaluacion_${id}.pdf`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('verify/:code')
    async verify(@Param('code') code: string) {
        const evaluation = await this.evaluationsService.findOneByFilter({ codigoVerificacion: code });
        if (!evaluation) {
            return { valid: false, message: 'Código de verificación no válido' };
        }
        return { valid: true, evaluation };
    }

    @Get()
    async findAll(@Query() query: any) {
        return this.evaluationsService.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.evaluationsService.findOne(id);
    }
}
