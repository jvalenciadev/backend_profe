import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createArchive = require('archiver');

export interface SftpItem {
  nombre: string;
  rutaRelativa: string;
  tipo: 'CARPETA' | 'ARCHIVO';
  pesoBytes?: number;
  pesoFormateado?: string;
  fechaModificacion: Date;
  extension?: string;
  totalElementos?: number;
}

export interface ContextoForense {
  ip: string;
  xForwardedFor?: string | null;
  userAgent: string;
  navegador?: string;
  sistemaOperativo?: string;
  dispositivo?: string;
  referer?: string | null;
  origin?: string | null;
  host?: string | null;
  method?: string;
  url?: string;
  idioma?: string | null;
}

@Injectable()
export class SftpService {
  private readonly baseDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.baseDir =
      process.env.SFTP_STORAGE_PATH ||
      (process.platform === 'win32'
        ? path.resolve(process.cwd(), 'sftp_storage')
        : '/var/sftp/documentos');

    this.asegurarDirectorioBase();
  }

  private asegurarDirectorioBase() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      console.warn(`[SftpService] No se pudo crear o verificar baseDir (${this.baseDir}):`, err);
    }
  }

  /**
   * Resuelve cualquier ruta relativa garantizando que NUNCA salga de this.baseDir (Anti-Path-Traversal)
   */
  private resolverRutaSegura(rutaRelativa: string = ''): string {
    const root = path.resolve(this.baseDir);
    if (!rutaRelativa || rutaRelativa.trim() === '') return root;

    // Sanitizar separadores y eliminar intentos de retroceso
    const normalizada = path
      .normalize(rutaRelativa.replace(/^(\/|\\)+/, ''))
      .replace(/^(\.\.(\/|\\|$))+/, '');

    const resuelta = path.resolve(root, normalizada);

    if (!resuelta.startsWith(root)) {
      throw new ForbiddenException('Intento de navegación no autorizado fuera del repositorio');
    }

    return resuelta;
  }

  private formatearBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private calcularSha256(filePath: string): string {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return 'NO_DISPONIBLE';
    }
  }

  /**
   * Registra bitácora forense de auditoría en audit_logs
   */
  private async registrarAuditoriaForense(params: {
    action: string;
    resourceId?: string;
    user: any;
    contexto: ContextoForense;
    detallesOperacion?: Record<string, any>;
  }) {
    try {
      const { user, contexto, detallesOperacion } = params;

      const payloadDetalles = {
        operacion: {
          accion: params.action,
          timestampUtc: new Date().toISOString(),
          metodo: contexto.method || 'GET',
          ruta: contexto.url || '',
        },
        cliente: {
          ipReal: contexto.ip,
          xForwardedFor: contexto.xForwardedFor || null,
          navegador: contexto.navegador || 'Desconocido',
          sistemaOperativo: contexto.sistemaOperativo || 'Desconocido',
          dispositivo: contexto.dispositivo || 'Desktop',
          userAgent: contexto.userAgent,
          idioma: contexto.idioma || null,
          host: contexto.host || null,
          origen: contexto.origin || null,
          referencia: contexto.referer || null,
        },
        usuario: {
          id: user?.id || user?.sub,
          username: user?.username || 'ANONIMO',
          email: user?.email || user?.correo || null,
          nombreCompleto: `${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || null,
          roles: user?.roles || [],
          tenantId: user?.tenantId || null,
        },
        archivo: detallesOperacion || {},
      };

      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          resource: 'SFTP_DOCUMENTOS',
          resourceId: params.resourceId || null,
          userId: user?.id || user?.sub || null,
          tenantId: user?.tenantId || null,
          ip: contexto.ip || '0.0.0.0',
          userAgent: contexto.userAgent || 'UNKNOWN',
          details: payloadDetalles as any,
        },
      });
    } catch (err) {
      console.error('[SftpService] Error al escribir en audit_logs:', err);
    }
  }

  /**
   * Explora el directorio o subdirectorio tipo Google Drive (Carpetas y Archivos)
   */
  async explorarDirectorio(
    subpath: string = '',
    user: any,
    contexto: ContextoForense,
  ): Promise<{
    rutaActual: string;
    carpetas: SftpItem[];
    archivos: SftpItem[];
    totalCarpetas: number;
    totalArchivos: number;
  }> {
    this.asegurarDirectorioBase();
    const dirFisico = this.resolverRutaSegura(subpath);

    if (!fs.existsSync(dirFisico)) {
      throw new NotFoundException(`La carpeta "${subpath}" no existe en el repositorio`);
    }

    const stat = await fs.promises.stat(dirFisico);
    if (!stat.isDirectory()) {
      throw new BadRequestException('La ruta especificada no es un directorio');
    }

    const entries = await fs.promises.readdir(dirFisico, { withFileTypes: true });
    const carpetas: SftpItem[] = [];
    const archivos: SftpItem[] = [];

    const rutaRelativaLimpia = subpath.replace(/^(\/|\\)+/, '').replace(/\\/g, '/');

    for (const entry of entries) {
      try {
        const itemPath = path.join(dirFisico, entry.name);
        const itemStat = await fs.promises.stat(itemPath);
        const itemRelPath = rutaRelativaLimpia
          ? `${rutaRelativaLimpia}/${entry.name}`
          : entry.name;

        if (entry.isDirectory()) {
          // Contar elementos hijos de la carpeta
          let childCount = 0;
          try {
            const childs = await fs.promises.readdir(itemPath);
            childCount = childs.length;
          } catch { }

          carpetas.push({
            nombre: entry.name,
            rutaRelativa: itemRelPath,
            tipo: 'CARPETA',
            fechaModificacion: itemStat.mtime,
            totalElementos: childCount,
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).replace('.', '').toUpperCase();

          archivos.push({
            nombre: entry.name,
            rutaRelativa: itemRelPath,
            tipo: 'ARCHIVO',
            pesoBytes: itemStat.size,
            pesoFormateado: this.formatearBytes(itemStat.size),
            fechaModificacion: itemStat.mtime,
            extension: ext || 'FILE',
          });
        }
      } catch (err) {
        console.error(`[SftpService] Error al leer "${entry.name}":`, err);
      }
    }

    // Ordenar: carpetas alfabéticamente, archivos por nombre
    carpetas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    archivos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Registro de navegación en bitácora
    await this.registrarAuditoriaForense({
      action: 'SFTP_BROWSE_DIRECTORY',
      resourceId: rutaRelativaLimpia || '/',
      user,
      contexto,
      detallesOperacion: {
        carpetaConsultada: rutaRelativaLimpia || '/',
        totalCarpetas: carpetas.length,
        totalArchivos: archivos.length,
      },
    });

    return {
      rutaActual: rutaRelativaLimpia,
      carpetas,
      archivos,
      totalCarpetas: carpetas.length,
      totalArchivos: archivos.length,
    };
  }

  /**
   * Obtiene un archivo dentro de cualquier subcarpeta para descarga
   */
  async obtenerParaDescarga(
    rutaArchivo: string,
    user: any,
    contexto: ContextoForense,
  ): Promise<{ filePath: string; nombre: string; pesoBytes: number }> {
    const filePath = this.resolverRutaSegura(rutaArchivo);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`El documento solicitado no existe`);
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      throw new BadRequestException('No es posible descargar una carpeta directamente');
    }

    const sha256 = this.calcularSha256(filePath);
    const nombre = path.basename(filePath);

    // Registro forense con hash SHA-256
    await this.registrarAuditoriaForense({
      action: 'SFTP_DOWNLOAD_DOCUMENT',
      resourceId: rutaArchivo,
      user,
      contexto,
      detallesOperacion: {
        nombre,
        rutaRelativa: rutaArchivo,
        pesoBytes: stats.size,
        pesoFormateado: this.formatearBytes(stats.size),
        sha256Criptografico: sha256,
        fechaModificacion: stats.mtime,
      },
    });

    return {
      filePath,
      nombre,
      pesoBytes: stats.size,
    };
  }

  /**
   * Comprime una carpeta completa como ZIP y hace streaming a la respuesta HTTP
   */
  async descargarCarpetaComoZip(
    rutaCarpeta: string,
    user: any,
    contexto: ContextoForense,
    res: Response,
  ): Promise<void> {
    const dirFisico = this.resolverRutaSegura(rutaCarpeta);

    if (!fs.existsSync(dirFisico)) {
      throw new NotFoundException(`La carpeta solicitada no existe`);
    }

    const stats = await fs.promises.stat(dirFisico);
    if (!stats.isDirectory()) {
      throw new BadRequestException('La ruta especificada no es una carpeta');
    }

    const nombreCarpeta = path.basename(dirFisico) || 'documentos';
    const nombreZip = `${nombreCarpeta}.zip`;

    // Cabeceras para descarga ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Crear el archivo ZIP en streaming
    const archivo = createArchive('zip', {
      zlib: { level: 6 },
    });

    // Pipe directo al response HTTP (no guarda en disco)
    archivo.pipe(res as any);

    // Agregar toda la carpeta recursivamente
    archivo.directory(dirFisico, nombreCarpeta);

    // Registrar en audit_logs
    await this.registrarAuditoriaForense({
      action: 'SFTP_DOWNLOAD_FOLDER',
      resourceId: rutaCarpeta || '/',
      user,
      contexto,
      detallesOperacion: {
        nombreCarpeta,
        rutaRelativa: rutaCarpeta,
        nombreZip,
        fechaModificacion: stats.mtime,
      },
    });

    // Finalizar el archivo (dispara el streaming)
    await archivo.finalize();
  }
}
