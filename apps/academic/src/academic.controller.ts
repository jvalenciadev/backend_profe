import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '@app/common';

@Controller('academic-ops')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) { }

  /**
   * Crear versión operativa desde un Maestro (Programa)
   */
  @Post('versionalizar/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  versionalizar(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.academicService.crearVersionDesdeMaster(id, data, req.user);
  }

  /**
   * Inscribir participante
   */
  @Post('inscripciones')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  inscribir(@Body() data: any, @Req() req: any) {
    return this.academicService.inscribir(data, req.user);
  }
}
