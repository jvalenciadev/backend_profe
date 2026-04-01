import {
  Controller,
  Post,
  Body,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RegistrationUseCase } from '../../application/use-cases/registration.use-case';
import { RequestVerificationUseCase } from '../../application/use-cases/request-verification.use-case';
import { LookupsUseCase } from '../../application/use-cases/lookups.use-case';
import { Public } from '@app/common';
import { UploadConfigService } from '@app/common';

@Public()
@Controller('public/banco-profesional')
export class PublicBancoProfesionalController {
  constructor(
    private readonly registrationUseCase: RegistrationUseCase,
    private readonly requestVerificationUseCase: RequestVerificationUseCase,
    private readonly lookupsUseCase: LookupsUseCase,
    private readonly uploadConfigService: UploadConfigService,
  ) {}

  @Post('registrar')
  registrar(@Body() data: any) {
    return this.registrationUseCase.execute(data);
  }

  @Post('request-verification')
  requestVerification(@Body('email') email: string) {
    return this.requestVerificationUseCase.execute(email);
  }

  @Get('config/tipos-posgrado')
  getTiposPosgrado() {
    return this.lookupsUseCase.getTiposPosgrado();
  }

  @Get('config/categorias')
  getCategorias() {
    return this.lookupsUseCase.getCategorias();
  }

  @Get('config/cargos')
  getCargos() {
    return this.lookupsUseCase.getCargos();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async publicUpload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se ha subido ningún archivo');

    const tableName = 'banco_profesional';

    // Dynamic validation from DB config
    await this.uploadConfigService.validateImage(tableName, file);

    // Dynamic pathing
    const finalPath = await this.uploadConfigService.getDynamicPath(
      null,
      tableName,
    );
    const uploadsRoot = path.join(process.cwd(), 'uploads');

    try {
      await fs.mkdir(finalPath, { recursive: true });
      const timestamp = Date.now();
      const fileExt = path.extname(file.originalname);
      const filename = `${timestamp}${fileExt}`;
      const fullPath = path.join(finalPath, filename);

      await fs.writeFile(fullPath, file.buffer);

      const relativePath = path
        .relative(uploadsRoot, fullPath)
        .replace(/\\/g, '/');
      const fileUrl = `/uploads/${relativePath}`;

      return {
        success: true,
        message: 'Archivo subido correctamente',
        data: { path: fileUrl },
      };
    } catch (error) {
      throw new BadRequestException(
        'No se pudo guardar el archivo: ' + error.message,
      );
    }
  }
}
