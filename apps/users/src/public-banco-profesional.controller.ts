import { Controller, Post, Body, Get, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BancoProfesionalService } from './banco-profesional.service';
import { Public } from '@app/common';

@Public()
@Controller('public/banco-profesional')
export class PublicBancoProfesionalController {
  constructor(private readonly service: BancoProfesionalService) { }

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

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async publicUpload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se ha subido ningún archivo');

    const tableName = 'banco_profesional';
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const finalPath = path.join(uploadsRoot, 'public', tableName, new Date().getFullYear().toString());

    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }

    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const filename = `${timestamp}${fileExt}`;
    const fullPath = path.join(finalPath, filename);

    fs.writeFileSync(fullPath, file.buffer);

    const relativePath = path.relative(uploadsRoot, fullPath).replace(/\\/g, '/');
    const fileUrl = `/uploads/${relativePath}`;

    return {
      success: true,
      message: 'Arhivo subido correctamente',
      data: { path: fileUrl }
    };
  }
}
