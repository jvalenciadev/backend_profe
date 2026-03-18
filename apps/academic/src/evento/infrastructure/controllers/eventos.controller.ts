import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PoliciesGuard } from '@app/common';
import { GetEventosUseCase, GetEventoByIdUseCase, CreateEventoUseCase, UpdateEventoUseCase, DeleteEventoUseCase } from '../../application/use-cases/evento.use-cases';

@Controller('eventos')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class EventosController {
    constructor(
        private readonly getEventosUseCase: GetEventosUseCase,
        private readonly getEventoByIdUseCase: GetEventoByIdUseCase,
        private readonly createEventoUseCase: CreateEventoUseCase,
        private readonly updateEventoUseCase: UpdateEventoUseCase,
        private readonly deleteEventoUseCase: DeleteEventoUseCase,
    ) { }

    @Get()
    findAll(@Query() query: any, @Req() req: any) {
        return this.getEventosUseCase.execute(query, req.ability);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.getEventoByIdUseCase.execute(id, req.ability);
    }

    @Post()
    create(@Body() data: any, @Req() req: any) {
        return this.createEventoUseCase.execute(data, req.user?.id);
    }

    @Put(':id')
    updatePut(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.updateEventoUseCase.execute(id, data, req.user?.id);
    }

    @Patch(':id')
    updatePatch(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.updateEventoUseCase.execute(id, data, req.user?.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.deleteEventoUseCase.execute(id, req.user?.id);
    }
}
