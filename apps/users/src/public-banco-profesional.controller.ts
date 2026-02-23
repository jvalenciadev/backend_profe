import { Controller, Post, Body, Get } from '@nestjs/common';
import { BancoProfesionalService } from './banco-profesional.service';
import { Public } from '@app/common';

@Public()
@Controller('public/banco-profesional')
export class PublicBancoProfesionalController {
  constructor(private readonly service: BancoProfesionalService) {}

  @Post('registrar')
  registrar(@Body() data: any) {
    return this.service.registrar(data);
  }

  @Post('request-verification')
  requestVerification(@Body('email') email: string) {
    return this.service.requestVerification(email);
  }

  @Get('config/tipos-posgrado')
  getTiposPosgrado() {
    return this.service.getTiposPosgrado();
  }

  @Get('config/categorias')
  getCategorias() {
    return this.service.getCategorias();
  }

  @Get('config/cargos')
  getCargos() {
    return this.service.getCargos();
  }
}
