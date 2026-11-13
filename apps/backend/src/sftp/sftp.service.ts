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

export interface SftpDocumentItem {
  nombre: string;
  pesoBytes: number;
  pesoFormateado: string;
  fechaModificacion: Date;
  extension: string;
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
   * Resuelve la ruta del archivo asegurando prevención absoluta de Directory/Path Traversal
   */
  private resolverRutaSegura(filename?: string): string {
    const root = path.resolve(this.baseDir);
    if (!filename) return root;

    const sanitized = path.basename(filename.trim());
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    const resolved = path.resolve(root, sanitized);

    if (!resolved.startsWith(root)) {
      throw new ForbiddenException('Acceso fuera del directorio autorizado no permitido');
    }

    return resolved;
  }

  private formatearBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calcula el hash criptográfico SHA-256 para integridad forense
   */
  private calcularSha256(filePath: string): string {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return 'NO_DISPONIBLE';
    }
  }

  /**
   * Registra bitácora forense de máxima cobertura en audit_logs
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
   * Lista los documentos disponibles con registro de auditoría
   */
  async listarDocumentos(
    user: any,
    contexto: ContextoForense,
  ): Promise<SftpDocumentItem[]> {
    this.asegurarDirectorioBase();
    const root = this.resolverRutaSegura();

    if (!fs.existsSync(root)) {
      return [];
    }

    const entries = await fs.promises.readdir(root, { withFileTypes: true });
    const items: SftpDocumentItem[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        try {
          const filePath = path.join(root, entry.name);
          const stats = await fs.promises.stat(filePath);
          const ext = path.extname(entry.name).replace('.', '').toUpperCase();

          items.push({
            nombre: entry.name,
            pesoBytes: stats.size,
            pesoFormateado: this.formatearBytes(stats.size),
            fechaModificacion: stats.mtime,
            extension: ext || 'FILE',
          });
        } catch {
          // Ignorar archivos no legibles
        }
      }
    }

    items.sort(
      (a, b) => b.fechaModificacion.getTime() - a.fechaModificacion.getTime(),
    );

    // Auditoría exhaustiva de consulta de lista
    await this.registrarAuditoriaForense({
      action: 'SFTP_LIST_DOCUMENTS',
      user,
      contexto,
      detallesOperacion: {
        totalArchivosEncontrados: items.length,
        directorioOrigen: this.baseDir,
        archivosListados: items.map((i) => ({ nombre: i.nombre, peso: i.pesoFormateado })),
      },
    });

    return items;
  }

  /**
   * Obtiene la ruta física del archivo para descarga e incrusta hash criptográfico SHA-256
   */
  async obtenerParaDescarga(
    filename: string,
    user: any,
    contexto: ContextoForense,
  ): Promise<{ filePath: string; nombre: string; pesoBytes: number }> {
    const filePath = this.resolverRutaSegura(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`El documento "${filename}" no existe en el repositorio`);
    }

    const stats = await fs.promises.stat(filePath);
    const sha256 = this.calcularSha256(filePath);

    // Auditoría forense exhaustiva de descarga
    await this.registrarAuditoriaForense({
      action: 'SFTP_DOWNLOAD_DOCUMENT',
      resourceId: filename,
      user,
      contexto,
      detallesOperacion: {
        nombre: filename,
        rutaServidor: filePath,
        pesoBytes: stats.size,
        pesoFormateado: this.formatearBytes(stats.size),
        extension: path.extname(filename).replace('.', '').toUpperCase(),
        sha256Criptografico: sha256,
        fechaModificacionArchivo: stats.mtime,
      },
    });

    return {
      filePath,
      nombre: path.basename(filePath),
      pesoBytes: stats.size,
    };
  }

  /**
   * Sube un documento al repositorio con registro forense y hash
   */
  async subirDocumento(
    file: any,
    user: any,
    contexto: ContextoForense,
  ): Promise<SftpDocumentItem> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo para adjuntar');
    }

    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = this.resolverRutaSegura(safeName);

    await fs.promises.writeFile(targetPath, file.buffer);
    const stats = await fs.promises.stat(targetPath);
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Auditoría forense exhaustiva de subida
    await this.registrarAuditoriaForense({
      action: 'SFTP_UPLOAD_DOCUMENT',
      resourceId: safeName,
      user,
      contexto,
      detallesOperacion: {
        nombreOriginal: file.originalname,
        nombreGuardado: safeName,
        pesoBytes: stats.size,
        pesoFormateado: this.formatearBytes(stats.size),
        mimeType: file.mimetype,
        sha256Criptografico: sha256,
      },
    });

    return {
      nombre: safeName,
      pesoBytes: stats.size,
      pesoFormateado: this.formatearBytes(stats.size),
      fechaModificacion: stats.mtime,
      extension: path.extname(safeName).replace('.', '').toUpperCase() || 'FILE',
    };
  }

  /**
   * Elimina un documento con registro forense
   */
  async eliminarDocumento(
    filename: string,
    user: any,
    contexto: ContextoForense,
  ): Promise<{ success: boolean; message: string }> {
    const filePath = this.resolverRutaSegura(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`El documento "${filename}" no existe`);
    }

    const stats = await fs.promises.stat(filePath);
    const sha256 = this.calcularSha256(filePath);

    await fs.promises.unlink(filePath);

    // Auditoría forense de eliminación
    await this.registrarAuditoriaForense({
      action: 'SFTP_DELETE_DOCUMENT',
      resourceId: filename,
      user,
      contexto,
      detallesOperacion: {
        nombreEliminado: filename,
        pesoPrevioBytes: stats.size,
        sha256Previo: sha256,
      },
    });

    return { success: true, message: `Documento ${filename} eliminado del repositorio SFTP` };
  }
}
