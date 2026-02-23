import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';

/**
 * Fabrica de controladores CRUD genéricos con soporte ABAC
 */
export function CrudControllerFactory(modelPath: string) {
  @Controller(modelPath)
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  class BaseController {
    constructor(public service: any) {}

    @Post()
    async create(@Body() data: any, @Request() req: any) {
      return this.service.create(data, req.user);
    }

    @Get()
    async findAll(@Query() query: any, @Request() req: any) {
      return this.service.findAll(query, req.ability);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
      return this.service.findOne(id, req.ability);
    }

    @Put(':id')
    async updatePut(
      @Param('id') id: string,
      @Body() data: any,
      @Request() req: any,
    ) {
      return this.service.update(id, data, req.user, req.ability);
    }

    @Patch(':id')
    async updatePatch(
      @Param('id') id: string,
      @Body() data: any,
      @Request() req: any,
    ) {
      return this.service.update(id, data, req.user, req.ability);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
      return this.service.remove(id, req.user, req.ability);
    }
  }

  return BaseController;
}
