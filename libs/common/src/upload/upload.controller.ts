import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UploadConfigService } from './upload-config.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadConfig: UploadConfigService) { }

  @Post(':tableName')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Param('tableName') tableName: string,
    @CurrentUser() user: any,
  ) {
    if (!file)
      throw new BadRequestException('No se ha subido ningún archivo');

    // Validar dinámicamente según BD
    await this.uploadConfig.validateImage(tableName, file);

    // Obtener ruta dinámica
    const finalPath = await this.uploadConfig.getDynamicPath(
      user,
      tableName,
    );

    // Generar nombre único
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const filename = `${timestamp}${fileExt}`;
    const fullPath = path.join(finalPath, filename);

    // Guardar archivo asincrónicamente
    await fs.writeFile(fullPath, file.buffer);

    // Construir URL relativa correcta desde la carpeta uploads
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const relativePath = path
      .relative(uploadsRoot, fullPath)
      .replace(/\\/g, '/');

    const fileUrl = `/uploads/${relativePath}`;

    return {
      success: true,
      message: 'Archivo subido correctamente',
      data: {
        filename: filename,
        path: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }
}
