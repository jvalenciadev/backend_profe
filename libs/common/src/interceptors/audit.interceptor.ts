import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '@app/database';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Si la petición no tiene request (ej: microservicios TCP/gRPC sin HTTP context), no procesar
    if (!request) {
      return next.handle();
    }

    const { method } = request;
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      method,
    );

    if (!isWriteOperation) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.logAction(context, request, responseBody, null);
        },
        error: (err) => {
          this.logAction(context, request, null, err);
        },
      }),
    );
  }

  private async logAction(
    context: ExecutionContext,
    request: any,
    responseBody: any,
    error: any,
  ) {
    try {
      const user = request.user;
      const userId = user?.id || null;
      const tenantId = user?.tenantId || null;

      // Obtener nombre del recurso basado en el controlador
      const controllerName = context.getClass().name;
      const handlerName = context.getHandler().name;
      const resource = controllerName.replace('Controller', '');

      // Determinar acción
      let action = 'UPDATE';
      if (request.method === 'POST') action = 'CREATE';
      if (request.method === 'DELETE') action = 'DELETE';

      // Sanitizar el body de claves privadas
      const cleanBody = this.sanitizeBody(request.body);

      // Buscar resourceId en params o response o body
      const resourceId =
        request.params?.id || responseBody?.id || cleanBody?.id || null;

      // Evitar logs infinitos al escribir en audit_logs
      if (resource.toLowerCase().includes('audit')) {
        return;
      }

      await this.prisma.auditLog.create({
        data: {
          action,
          resource,
          resourceId: resourceId ? String(resourceId) : null,
          userId,
          tenantId,
          ip:
            request.ip ||
            request.headers['x-forwarded-for'] ||
            request.socket?.remoteAddress ||
            null,
          userAgent: request.headers['user-agent'] || null,
          details: {
            url: request.url,
            method: request.method,
            body: cleanBody,
            params: request.params,
            query: request.query,
            handler: handlerName,
            status: error ? 'ERROR' : 'SUCCESS',
            errorMessage: error?.message || null,
          },
        },
      });
    } catch (e) {
      // Registrar error pero no interrumpir la ejecución principal del cliente
      console.error('[AuditInterceptor] Error writing audit log:', e);
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    if (typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveKeys = [
      'password',
      'contraseña',
      'clave',
      'token',
      'secret',
      'token_dispositivo',
      'accessToken',
      'pin',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '********';
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }
    return sanitized;
  }
}
