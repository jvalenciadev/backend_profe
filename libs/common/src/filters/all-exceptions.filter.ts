import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message = 'Error interno del servidor';
        let details: any = null;

        if (exception instanceof HttpException) {
            const res = exception.getResponse() as any;
            message = typeof res === 'string' ? res : res.message || message;
            details = res.error || null;
        } else {
            // Log the actual error for debugging
            console.error('Unhandled Exception:', exception);
            if (exception instanceof Error) {
                details = exception.message;
            }
        }

        // Translation Logic
        const translations: Record<string, string> = {
            'Internal server error': 'Error interno del servidor',
            'Not Found': 'Recurso no encontrado',
            'Unauthorized': 'No autorizado',
            'Forbidden': 'Acceso denegado',
            'Bad Request': 'Solicitud incorrecta',
            'Resource not found': 'Recurso no encontrado',
        };

        if (translations[message]) {
            message = translations[message];
        }

        // Prisma specific translations
        if (message.includes('Invalid') && message.includes('invocation')) {
            message = 'Error de validación en la base de datos (Datos incorrectos)';
        }

        if (message.includes('Argument') && message.includes('Expected')) {
            message = `Error de validación: ${message.replace('Argument', 'El argumento').replace('Expected', 'esperaba').replace('provided', 'pero se recibió')}`;
        }

        if (message.includes('Cannot') && (message.includes('PUT') || message.includes('PATCH') || message.includes('POST') || message.includes('GET'))) {
            const method = message.split(' ')[1];
            const path = message.split(' ')[2];
            message = `Ruta no encontrada: No se puede realizar una petición ${method} en ${path}. Verifique que el ID o la URL sean correctos.`;
        }

        // Contextual translations for generic CRUD
        if (message.includes('not found in')) {
            const parts = message.split('not found in');
            const idPart = parts[0].replace('Resource with ID ', '').trim();
            const modelPart = parts[1].trim();
            message = `Recurso con ID ${idPart} no encontrado en ${modelPart}`;
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message,
            error: details,
        });
    }
}
