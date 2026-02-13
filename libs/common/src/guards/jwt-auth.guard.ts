import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Guard JWT para proteger rutas que requieren autenticación
 * Uso: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        // Mensajes de error en espa\u00F1ol
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Su sesión ha expirado. Por favor, inicie sesión nuevamente');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Token inv\u00E1lido. Por favor, inicie sesión nuevamente');
            }
            if (info?.message === 'No auth token') {
                throw new UnauthorizedException('No se proporcionó token de autenticación. Debe iniciar sesión');
            }
            throw err || new UnauthorizedException('No autorizado. Debe iniciar sesión para acceder a este recurso');
        }
        return user;
    }
}
