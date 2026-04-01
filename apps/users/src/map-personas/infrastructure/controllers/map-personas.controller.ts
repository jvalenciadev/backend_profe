import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FindMapPersonasUseCase } from '../../application/use-cases/find-map-personas.use-case';
import { ImportMapPersonasUseCase } from '../../application/use-cases/import-map-personas.use-case';
import { GetMapCatalogsUseCase } from '../../application/use-cases/get-map-catalogs.use-case';

@Controller('map-personas')
export class MapPersonasController {
  constructor(
    private readonly findUseCase: FindMapPersonasUseCase,
    private readonly importUseCase: ImportMapPersonasUseCase,
    private readonly catalogUseCase: GetMapCatalogsUseCase,
  ) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.findUseCase.execute(query);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobId') jobId: string,
  ) {
    const id = jobId || `job_${Date.now()}`;
    return this.importUseCase.execute(file.buffer, id);
  }

  @Get('import/status/:jobId')
  async getImportStatus(@Param('jobId') jobId: string) {
    return this.importUseCase.getStatus(jobId);
  }

  @Post('import/cancel/:jobId')
  async cancelImport(@Param('jobId') jobId: string) {
    this.importUseCase.cancelJob(jobId);
    return { success: true };
  }

  @Get('stats')
  async getStats() {
    return this.catalogUseCase.getStats();
  }

  @Get('catalogs/cargos')
  async getCargos() {
    return this.catalogUseCase.getCargos();
  }

  @Get('catalogs/categorias')
  async getCategorias() {
    return this.catalogUseCase.getCategorias();
  }

  @Get('catalogs/niveles')
  async getNiveles() {
    return this.catalogUseCase.getNiveles();
  }

  @Get('catalogs/subsistemas')
  async getSubsistemas() {
    return this.catalogUseCase.getSubsistemas();
  }

  @Get('catalogs/especialidades')
  async getEspecialidades() {
    return this.catalogUseCase.getEspecialidades();
  }

  @Get('catalogs/generos')
  async getGeneros() {
    return this.catalogUseCase.getGeneros();
  }

  @Get('catalogs/areas')
  async getAreas() {
    return this.catalogUseCase.getAreas();
  }
}
