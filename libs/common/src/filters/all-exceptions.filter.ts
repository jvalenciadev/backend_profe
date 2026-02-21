import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Filtro global de excepciones con mensajes en español
 * Maneja todos los tipos de errores: HTTP, Prisma, Validación, etc.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno del servidor';
        let details: any = null;
        let errorCode: string | null = null;

        // ==================== HTTP EXCEPTIONS ====================
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse() as any;

            if (typeof exceptionResponse === 'string') {
                message = this.translateMessage(exceptionResponse);
            } else {
                if (Array.isArray(exceptionResponse.message)) {
                    message = exceptionResponse.message
                        .map((msg: string) => this.translateMessage(msg))
                        .join(', ');
                } else {
                    message = this.translateMessage(exceptionResponse.message || message);
                }
                details = exceptionResponse.error || exceptionResponse.details || null;
            }
        }
        // ==================== PRISMA EXCEPTIONS ====================
        else if (exception && (exception as any).constructor.name === 'PrismaClientKnownRequestError') {
            const prismaError = this.handlePrismaError(exception);
            status = prismaError.status;
            message = prismaError.message;
            errorCode = (exception as any).code;
            details = prismaError.details;
        }
        else if (exception && (exception as any).constructor.name === 'PrismaClientValidationError') {
            status = HttpStatus.BAD_REQUEST;
            message = 'Error de validación en los datos enviados';
            details = this.extractPrismaValidationDetails((exception as any).message);
        }
        else if (exception && (exception as any).constructor.name === 'PrismaClientInitializationError') {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = 'Error de conexión con la base de datos';
            details = 'No se pudo establecer conexión con la base de datos';
            this.logger.error('Database connection error:', exception);
        }
        else if (exception && (exception as any).constructor.name === 'PrismaClientUnknownRequestError') {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Error desconocido en la base de datos';
            details = (exception as any).message || null;
            this.logger.error('Unknown Prisma error:', exception);
        }
        // ==================== GENERIC ERRORS ====================
        else if (exception instanceof Error) {
            message = this.translateMessage(exception.message);
            details = exception.stack;
            this.logger.error('Unhandled Error:', exception);
        }

        // Determinar si es una solicitud de API (necesita JSON) o de navegador (puede recibir HTML)
        const acceptHeader = request.headers.accept || '';
        const isApiRequest = request.url.startsWith('/api') || !acceptHeader.includes('text/html');

        // Solo mostrar página de error creativa para 404 y 401 si se pide HTML explícitamente
        // y NO es una petición AJAX (X-Requested-With no presente o no es XMLHttpRequest)
        const isAjax = request.headers['x-requested-with'] === 'XMLHttpRequest';
        const prefersHtml = acceptHeader.includes('text/html') && !acceptHeader.includes('application/json');

        if (prefersHtml && !isAjax && (status === HttpStatus.NOT_FOUND || status === HttpStatus.UNAUTHORIZED)) {
            const isAuthError = status === HttpStatus.UNAUTHORIZED;
            const bgColor = isAuthError ? '#fef2f2' : '#f0f9ff';
            const titleColor = isAuthError ? '#991b1b' : '#075985';

            return response.status(status).send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>PROGRAMA PROFE - ${message}</title>
                    <style>
                        body { font-family: 'Roboto', Helvetica, Arial, sans-serif, serif; background-color: ${bgColor}; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 500px; text-align: center; border-top: 5px solid ${titleColor}; }
                        .logo { font-weight: 900; font-size: 2rem; color: #1e293b; letter-spacing: -1px; margin-bottom: 1.5rem; }
                        .logo span { color: #2563eb; }
                        .code { font-size: 5rem; font-weight: 900; color: ${titleColor}; line-height: 1; margin-bottom: 1rem; opacity: 0.8; }
                        .message { font-size: 1.25rem; color: #334155; margin-bottom: 2rem; font-weight: 500; }
                        .details { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; color: #64748b; text-align: left; margin-bottom: 2rem; word-break: break-all; }
                        .btn { display: inline-block; background: #2563eb; color: white; padding: 0.8rem 2rem; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1rem; transition: all 0.3s; }
                        .btn:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
                        .footer-text { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="logo">PROGRAMA <span>PROFE</span></div>
                        <div class="code">${status}</div>
                        <div class="message">${message}</div>
                        <div class="details">
                            <strong>MÉTODO:</strong> ${request.method}<br>
                            <strong>RECURSO:</strong> ${request.url}<br>
                            <strong>IP_ORIGEN:</strong> ${request.ip}
                        </div>
                        <a href="#" class="btn" onclick="window.history.back()">Regresar</a>

                        <div class="footer-text">
                            &copy; 2026 Ministerio de Educación - Sistema PROFE api-rest v2.0
                        </div>
                    </div>
                </body>
                </html>
            `);
        }

        // Respuesta estructurada JSON (Serialización segura de BigInt)
        const responseBody = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: message,
            errorCode: errorCode,
            details: (process.env.NODE_ENV === 'production' && status !== 400) ? null : details,
        };

        const safeResponse = JSON.parse(JSON.stringify(responseBody, (_, v) =>
            typeof v === 'bigint' ? v.toString() : v
        ));

        if (status >= 400) {
            console.error(`[AllExceptionsFilter] Error ${status}: ${message}`, {
                path: request.url,
                method: request.method,
                details: details
            });
        }

        response.status(status).json(safeResponse);
    }

    /**
     * Traducción de mensajes comunes a español
     */
    private translateMessage(msg: string): string {
        if (!msg) return 'Error desconocido';
        const translations: Record<string, string> = {
            'Unauthorized': 'No autorizado - Inicie sesión nuevamente',
            'Forbidden': 'Acceso denegado - No tiene permisos suficientes',
            'Not Found': 'Recurso no encontrado',
            'Internal Server Error': 'Error interno del servidor',
            'Bad Request': 'Solicitud incorrecta - Verifique los datos enviados',
            'Cannot POST': 'Ruta no encontrada para el método POST',
            'Cannot GET': 'Ruta no encontrada para el método GET',
            'Cannot PUT': 'Ruta no encontrada para el método PUT',
            'Cannot DELETE': 'Ruta no encontrada para el método DELETE',
        };
        return translations[msg] || msg;
    }

    /**
     * Manejador de errores específicos de Prisma
     */
    private handlePrismaError(error: any) {
        switch (error.code) {
            case 'P2002': // Unique constraint violation
                const target = error.meta?.target || 'campo';
                return {
                    status: HttpStatus.CONFLICT,
                    message: `Ya existe un registro con este ${target}. Debe ser único.`,
                    details: error.meta
                };
            case 'P2003': // Foreign key constraint violation
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Error de relación: Se está haciendo referencia a un registro que no existe.',
                    details: error.meta
                };
            case 'P2025': // Record not found
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'El registro solicitado no fue encontrado en la base de datos.',
                    details: error.meta
                };
            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error de base de datos (Prisma)',
                    details: error.message
                };
        }
    }

    private extractPrismaValidationDetails(message: string): string {
        const lines = message.split('\n');
        return lines.length > 0 ? lines[lines.length - 1].trim() : message;
    }
}
