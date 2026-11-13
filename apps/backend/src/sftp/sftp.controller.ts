import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/common';
import { SftpService, ContextoForense } from './sftp.service';
import type { Response } from 'express';

@Controller('sftp')
@UseGuards(JwtAuthGuard)
export class SftpController {
  constructor(private readonly sftpService: SftpService) {}

  /**
   * Extrae la huella digital y contexto forense completo de la petición HTTP
   */
  private extraerContextoForense(req: any): ContextoForense {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ipReal =
      (typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : null) ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      '0.0.0.0';

    const userAgent = req.headers['user-agent'] || 'UNKNOWN';

    let sistemaOperativo = 'Desconocido';
    if (/windows phone/i.test(userAgent)) sistemaOperativo = 'Windows Phone';
    else if (/win(dows|98|me|nt|xp|7|8|10|11)/i.test(userAgent)) sistemaOperativo = 'Windows';
    else if (/android/i.test(userAgent)) sistemaOperativo = 'Android';
    else if (/iphone|ipad|ipod/i.test(userAgent)) sistemaOperativo = 'iOS';
    else if (/mac(intosh|_powerpc)/i.test(userAgent)) sistemaOperativo = 'macOS';
    else if (/linux/i.test(userAgent)) sistemaOperativo = 'Linux';

    let navegador = 'Desconocido';
    if (/edg/i.test(userAgent)) navegador = 'Microsoft Edge';
    else if (/chrome|crios/i.test(userAgent)) navegador = 'Google Chrome';
    else if (/firefox|fxios/i.test(userAgent)) navegador = 'Mozilla Firefox';
    else if (/safari/i.test(userAgent)) navegador = 'Apple Safari';
    else if (/opera|opr/i.test(userAgent)) navegador = 'Opera';

    const dispositivo = /mobi|android|iphone|ipad/i.test(userAgent) ? 'Móvil / Tablet' : 'Escritorio (PC)';

    return {
      ip: String(ipReal).replace('::ffff:', ''),
      xForwardedFor: typeof xForwardedFor === 'string' ? xForwardedFor : null,
      userAgent,
      navegador,
      sistemaOperativo,
      dispositivo,
      referer: req.headers['referer'] || null,
      origin: req.headers['origin'] || null,
      host: req.headers['host'] || null,
      method: req.method,
      url: req.originalUrl || req.url,
      idioma: req.headers['accept-language'] || null,
    };
  }

  private validarRolSftp(user: any) {
    const roles: string[] = (user?.roles || []).map((r: any) =>
      (typeof r === 'string' ? r : r.name || '').toLowerCase(),
    );

    const tieneAcceso = roles.some(
      (r) => r === 'sftp' || r === 'super_admin' || r === 'admin',
    );

    if (!tieneAcceso) {
      throw new ForbiddenException(
        'Acceso restringido: Se requiere el rol SFTP para operar en este repositorio',
      );
    }
  }

  /**
   * Explora carpetas y archivos en la ruta especificada (Estilo Google Drive)
   */
  @Get('documentos')
  async listar(
    @Query('subpath') subpath: string = '',
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prohibir caché en proxies y navegador (datos en tiempo real)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    this.validarRolSftp(req.user);
    const contexto = this.extraerContextoForense(req);
    return this.sftpService.explorarDirectorio(subpath || '', req.user, contexto);
  }

  /**
   * Descarga un archivo de cualquier carpeta o subcarpeta
   */
  @Get('documentos/download')
  async descargar(
    @Query('filepath') filepath: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    this.validarRolSftp(req.user);
    if (!filepath || filepath.trim() === '') {
      throw new BadRequestException('El parámetro filepath es obligatorio');
    }

    const contexto = this.extraerContextoForense(req);
    const { filePath, nombre } = await this.sftpService.obtenerParaDescarga(
      filepath,
      req.user,
      contexto,
    );

    res.download(filePath, nombre);
  }
}
