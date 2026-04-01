import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Permitir acceso público a archivos subidos
    if (request.url.startsWith('/uploads')) {
      return true;
    }

    // SENIOR BYPASS: Si la petición ya trae un token de sesión (JWT), permitimos el paso.
    // El JwtAuthGuard se encargará de la validación del usuario después.
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    const apiKey = request.headers['x-secret'] || request.headers['X-SECRET'];
    const secretKey =
      this.configService.get<string>('LMS_API_SECRET_KEY') ||
      this.configService.get<string>('API_SECRET_KEY') ||
      'mQsYt86mu5wiiqjmwyxYXMqeHVo4lRqIT6dQUwqYqzM=';

    if (!apiKey || apiKey !== secretKey) {
      console.warn(
        `[ApiKeyGuard] Unauthorized. Path: ${request.url}. Access denied (No X-SECRET and no JWT).`,
      );
      throw new UnauthorizedException(
        'Acceso no autorizado: Se requiere llave secreta o sesión activa',
      );
    }

    return true;
  }
}
