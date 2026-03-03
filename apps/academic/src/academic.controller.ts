import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { CreateAcademicVersionUseCase } from './oferta/application/use-cases/create-academic-version.use-case';
import { JwtAuthGuard, CurrentUser } from '@app/common';

@Controller('academic-ops')
export class AcademicController {
  constructor(private readonly createVersionUseCase: CreateAcademicVersionUseCase) { }

  /**
   * Crear versión operativa desde un Maestro (Programa)
   */
  @Post('versionalizar/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  versionalizar(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any
  ) {
    return this.createVersionUseCase.execute(id, data, user);
  }

  @Post('health')
  health() {
    console.log('Restarting Academic microservice for repository changes...');
    return { status: 'ok' };
  }
}
