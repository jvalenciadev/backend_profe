import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { AcademicService } from './academic.service';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) { }

  @Post('programas')
  createPrograma(@Body() data: any, @Req() req: any) {
    const user = req.user || { id: 1 };
    return this.academicService.createPrograma(data, user);
  }

  @Get('programas')
  findAllProgramas(@Query('tenantId') tenantId: string) {
    return this.academicService.findAllProgramas(tenantId);
  }

  @Post('modulos')
  createModulo(@Body() data: any) {
    return this.academicService.createModulo(data);
  }

  @Post('inscripciones')
  inscribir(@Body() data: any, @Req() req: any) {
    const user = req.user || { id: 1 };
    return this.academicService.inscribir(data, user);
  }
}
