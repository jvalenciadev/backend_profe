import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import * as FileType from 'file-type';

@Injectable()
export class UploadConfigService {
  private readonly baseUploadDir = 'uploads';

  constructor(private prisma: PrismaService) { }

  /**
   * Obtiene todas las configuraciones de carga
   */
  async findAll() {
    return this.prisma.uploadConfig.findMany({
      orderBy: { tableName: 'asc' }
    });
  }

  /**
   * Obtiene una configuración por nombre de tabla
   */
  async findOneByTable(tableName: string) {
    return this.prisma.uploadConfig.findUnique({
      where: { tableName }
    });
  }

  /**
   * Crea una nueva configuración
   */
  async create(data: any) {
    return this.prisma.uploadConfig.create({
      data: {
        ...data,
        maxSizeMB: parseFloat(data.maxSizeMB || '5'),
        minWidth: data.minWidth ? parseInt(data.minWidth) : null,
        maxWidth: data.maxWidth ? parseInt(data.maxWidth) : null,
        minHeight: data.minHeight ? parseInt(data.minHeight) : null,
        maxHeight: data.maxHeight ? parseInt(data.maxHeight) : null,
      }
    });
  }

  /**
   * Actualiza una configuración existente
   */
  async update(id: string, data: any) {
    const { id: _, ...rest } = data;
    return this.prisma.uploadConfig.update({
      where: { id },
      data: {
        ...rest,
        maxSizeMB: data.maxSizeMB ? parseFloat(data.maxSizeMB) : undefined,
        minWidth: data.minWidth !== undefined ? (data.minWidth ? parseInt(data.minWidth) : null) : undefined,
        maxWidth: data.maxWidth !== undefined ? (data.maxWidth ? parseInt(data.maxWidth) : null) : undefined,
        minHeight: data.minHeight !== undefined ? (data.minHeight ? parseInt(data.minHeight) : null) : undefined,
        maxHeight: data.maxHeight !== undefined ? (data.maxHeight ? parseInt(data.maxHeight) : null) : undefined,
      }
    });
  }

  /**
   * Elimina una configuración
   */
  async remove(id: string) {
    return this.prisma.uploadConfig.delete({
      where: { id }
    });
  }

  /**
   * Genera la ruta dinámica de almacenamiento:
   * uploads/{departamento}/{tabla}/{año}/{mes}
   */
  async getDynamicPath(user: any, tableName: string): Promise<string> {
    let deptName = 'global';

    if (user?.tenantId) {
      const dept = await this.prisma.departamento.findUnique({
        where: { id: user.tenantId },
        select: { nombre: true },
      });
      if (dept) deptName = dept.nombre.toLowerCase().replace(/\s+/g, '_');
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const fullPath = path.join(
      this.baseUploadDir,
      deptName,
      tableName.toLowerCase(),
      year,
      month,
    );

    if (!existsSync(fullPath)) {
      await fs.mkdir(fullPath, { recursive: true });
    }

    return fullPath;
  }

  /**
   * Valida una imagen según la configuración dinámica en la base de datos
   */
  async validateImage(tableName: string, file: any): Promise<boolean> {
    // Buscar configuración específica para la tabla
    const config = await (this.prisma as any).uploadConfig.findUnique({
      where: { tableName },
    });

    const envMaxSize = process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) : 20;

    if (!config || config.estado !== 'activo') {
      // Si no hay configuración o no está activa, usamos validación por defecto o .env
      const maxSizeBytes = envMaxSize * 1024 * 1024;
      if (file.size > maxSizeBytes) { 
        throw new BadRequestException(`El archivo excede el tamaño máximo permitido (${envMaxSize}MB)`);
      }
      return true;
    }

    // 1. Validar Extensión y Magic Bytes reales (Seguridad Básica contra spoofing de extensiones)
    const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowedExtensions = config.allowedExtensions.toLowerCase().split(',').map((e: string) => e.trim());

    if (!allowedExtensions.includes(fileExt)) {
      throw new BadRequestException(
        `Extensión de archivo .${fileExt} no permitida. Permitidas: ${config.allowedExtensions}`,
      );
    }

    // Usar file-type para descubrir el verdadero formato analizando el Buffer
    try {
      const fileInfo = await FileType.fromBuffer(file.buffer);
      
      if (fileInfo) {
        // fileInfo.ext devuelve extensiones canónicas. ej. jpg, png, pdf, zip
        const detectedExt = fileInfo.ext.toLowerCase();

        // Algunas excepciones comunes (docx, xlsx, pptx internamente son zip)
        const isOfficeDoc = ['docx', 'xlsx', 'pptx'].includes(fileExt) && detectedExt === 'zip';
        
        // Excepción de jpg/jpeg
        const isJpegVar = (fileExt === 'jpg' && detectedExt === 'jpg') || (fileExt === 'jpeg' && detectedExt === 'jpg');

        if (!isOfficeDoc && !isJpegVar && detectedExt !== fileExt) {
          throw new BadRequestException(`Format mismatch. Pretende ser ${fileExt} pero internamente es ${detectedExt}`);
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.warn('Advertencia en file-type:', err);
    }

    // 2. Validar Tamaño (Priorizar el menor entre Config y ENV)
    const activeMaxSize = Math.min(config.maxSizeMB, envMaxSize);
    const maxSizeBytes = activeMaxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo permitido (${activeMaxSize}MB)`,
      );
    }

    // 3. Validaciones de Imagen (Dimensiones)
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    if (imageExtensions.includes(fileExt)) {
      try {
        const metadata = await sharp(file.buffer).metadata();

        if (config.minWidth && metadata.width && metadata.width < config.minWidth) {
          throw new BadRequestException(`El ancho de la imagen es muy pequeño. Mínimo: ${config.minWidth}px (Actual: ${metadata.width}px)`);
        }
        if (config.maxWidth && metadata.width && metadata.width > config.maxWidth) {
          throw new BadRequestException(`El ancho de la imagen es muy grande. Máximo: ${config.maxWidth}px (Actual: ${metadata.width}px)`);
        }
        if (config.minHeight && metadata.height && metadata.height < config.minHeight) {
          throw new BadRequestException(`El alto de la imagen es muy bajo. Mínimo: ${config.minHeight}px (Actual: ${metadata.height}px)`);
        }
        if (config.maxHeight && metadata.height && metadata.height > config.maxHeight) {
          throw new BadRequestException(`El alto de la imagen es muy alto. Máximo: ${config.maxHeight}px (Actual: ${metadata.height}px)`);
        }

        // Validar Aspect Ratio si está definido (ej: "16:9", "1:1")
        if (config.aspectRatio && metadata.width && metadata.height) {
          const [targetW, targetH] = config.aspectRatio.split(':').map(Number);
          const currentRatio = metadata.width / metadata.height;
          const targetRatio = targetW / targetH;
          const tolerance = 0.05; // 5% de tolerancia

          if (Math.abs(currentRatio - targetRatio) > tolerance) {
            throw new BadRequestException(`La relación de aspecto de la imagen no coincide con la rquerida (${config.aspectRatio})`);
          }
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        // Si no es un BadRequest, probablemente sharp falló al procesar (archivo corrupto o no imagen real)
        throw new BadRequestException('No se pudo procesar la imagen para validación. Verifique el formato.');
      }
    }

    return true;
  }
}
