import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { CreateInscripcionUseCase } from '../../application/use-cases/create-inscripcion.use-case';
import { CreateInscripcionDto } from '../../application/dto/create-inscripcion.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@Controller('inscripciones')
@UseGuards(JwtAuthGuard)
export class InscripcionController {
    constructor(private readonly createInscripcionUseCase: CreateInscripcionUseCase) { }

    @Post()
    create(@Body() dto: CreateInscripcionDto, @Req() req: any) {
        return this.createInscripcionUseCase.execute(dto, req.user?.id);
    }
}
