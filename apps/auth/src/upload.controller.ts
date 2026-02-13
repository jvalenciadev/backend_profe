import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    Param,
    UseGuards,
    BadRequestException,
    Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, UploadConfigService } from '@app/common';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    constructor(private readonly uploadConfig: UploadConfigService) { }

    @Post(':tableName')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage()
    }))
    async uploadFile(
        @UploadedFile() file: any,
        @Param('tableName') tableName: string,
        @Req() req: any
    ) {
        if (!file) throw new BadRequestException('No se ha subido ning\u00FAn archivo');

        // Validar dinámicamente según BD
        await this.uploadConfig.validateImage(tableName, file);

        // Obtener ruta dinámica
        const finalPath = await this.uploadConfig.getDynamicPath(req.user, tableName);

        // Generar nombre único
        const timestamp = Date.now();
        const fileExt = path.extname(file.originalname);
        const filename = `${timestamp}${fileExt}`;
        const fullPath = path.join(finalPath, filename);

        // Guardar archivo
        fs.writeFileSync(fullPath, file.buffer);

        // Construir URL relativa correcta desde la carpeta uploads
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const relativePath = path.relative(uploadsRoot, fullPath).replace(/\\/g, '/');

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.AUTH_PORT || 3001}`;
        console.log('Upload URL Base:', baseUrl); // Debug log
        const fileUrl = `${baseUrl}/uploads/${relativePath}`;

        return {
            success: true,
            message: 'Archivo subido correctamente',
            data: {
                filename: filename,
                path: fileUrl,
                size: file.size,
                mimetype: file.mimetype
            }
        };
    }
}
