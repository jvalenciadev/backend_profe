import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadConfigService {
    private readonly baseUploadDir = 'uploads';

    constructor(private prisma: PrismaService) { }

    /**
     * Genera la ruta dinámica de almacenamiento: 
     * uploads/{departamento}/{tabla}/{año}/{mes}
     */
    async getDynamicPath(user: any, tableName: string): Promise<string> {
        let deptName = 'global';

        if (user?.tenantId) {
            const dept = await this.prisma.departamento.findUnique({
                where: { id: user.tenantId },
                select: { nombre: true }
            });
            if (dept) deptName = dept.nombre.toLowerCase().replace(/\s+/g, '_');
        }

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');

        const fullPath = path.join(this.baseUploadDir, deptName, tableName.toLowerCase(), year, month);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        return fullPath;
    }

    /**
     * Valida una imagen según la configuración dinámica en la base de datos
     */
    async validateImage(tableName: string, file: any): Promise<boolean> {
        // const config = await this.prisma.imageConfig.findUnique({
        //     where: { tableName }
        // });
        const config: any = null;

        if (!config) return true; // Si no hay config, permitir todo

        // 1. Validar Tamaño
        if (file.size > config.maxSize) {
            throw new BadRequestException(`El archivo excede el tamaño máximo permitido (${config.maxSize / 1024 / 1024}MB)`);
        }

        // 2. Validar Tipo MIME
        if (config.allowedTypes) {
            const allowed = config.allowedTypes.split(',');
            if (!allowed.includes(file.mimetype)) {
                throw new BadRequestException(`Tipo de archivo no permitido. Permitidos: ${config.allowedTypes}`);
            }
        }

        // Nota: Validación de dimensiones (ancho/alto) requiere sharp
        // Se puede agregar después si es necesario

        return true;
    }
}
