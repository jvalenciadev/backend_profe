import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Request } from '@nestjs/common';

export function CrudControllerFactory(modelPath: string) {
    @Controller(modelPath)
    class BaseController {
        constructor(public service: any) { }

        @Post()
        async create(@Body() data: any, @Request() req: any) {
            return this.service.create(data, req.user);
        }

        @Get()
        async findAll(@Query() query: any) {
            return this.service.findAll(query);
        }

        @Get(':id')
        async findOne(@Param('id') id: string) {
            return this.service.findOne(id);
        }

        @Put(':id')
        async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
            return this.service.update(id, data, req.user);
        }

        @Delete(':id')
        async remove(@Param('id') id: string, @Request() req: any) {
            return this.service.remove(id, req.user);
        }
    }

    return BaseController;
}
