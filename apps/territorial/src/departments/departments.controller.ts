import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard, Public } from '@app/common';

/**
 * Controlador de Departamentos
 * - GET (listar): Público
 * - POST, PUT, DELETE: Requieren autenticación
 */
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * Crear departamento - REQUIERE AUTENTICACIÓN
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDepartmentDto: CreateDepartmentDto, @Req() req: any) {
    return this.departmentsService.create(createDepartmentDto, req.user);
  }

  /**
   * Listar todos los departamentos - PÚBLICO
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.departmentsService.findAll();
  }

  /**
   * Obtener un departamento por ID - PÚBLICO
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findOne(id);
  }

  /**
   * Actualizar departamento - REQUIERE AUTENTICACIÓN
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @Req() req: any,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @Req() req: any,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto, req.user);
  }

  /**
   * Eliminar departamento (soft delete) - REQUIERE AUTENTICACIÓN
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.departmentsService.remove(id, req.user);
  }
}
