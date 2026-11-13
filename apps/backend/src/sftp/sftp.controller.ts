import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/common';
import { SftpService, ContextoForense } from './sftp.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sftp')
@UseGuards(JwtAuthGuard)
export class SftpController {
  constructor(private readonly sftpService: SftpService) {}

  /**
   * Extrae la huella digital y contexto forense completo de la petición HTTP
   */
  private extraerContextoForense(req: any): ContextoForense {
    // 1. Detección de IP Real a través de Proxies Inversos (Nginx / Cloudflare / Docker)
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

    // 2. Parser ligero de Sistema Operativo y Navegador
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

  /**
   * Valida que el usuario autenticado posea el rol 'sftp' o sea Administrador
   */
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

  @Get('documentos')
  async listar(@Req() req: any) {
    this.validarRolSftp(req.user);
    const contexto = this.extraerContextoForense(req);
    return this.sftpService.listarDocumentos(req.user, contexto);
  }

  @Get('documentos/:filename/download')
  async descargar(
    @Param('filename') filename: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    this.validarRolSftp(req.user);
    const contexto = this.extraerContextoForense(req);

    const { filePath, nombre } = await this.sftpService.obtenerParaDescarga(
      filename,
      req.user,
      contexto,
    );

    res.download(filePath, nombre);
  }

  @Post('documentos/upload')
  @UseInterceptors(FileInterceptor('file'))
  async subir(
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    this.validarRolSftp(req.user);
    const contexto = this.extraerContextoForense(req);

    return this.sftpService.subirDocumento(file, req.user, contexto);
  }

  @Delete('documentos/:filename')
  async eliminar(@Param('filename') filename: string, @Req() req: any) {
    this.validarRolSftp(req.user);
    const contexto = this.extraerContextoForense(req);

    return this.sftpService.eliminarDocumento(filename, req.user, contexto);
  }
}
