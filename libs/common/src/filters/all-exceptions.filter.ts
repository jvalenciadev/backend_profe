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
 * Filtro global de excepciones con mensajes en espa\u00F1ol
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
        // ==================== UNKNOWN EXCEPTIONS ====================
        else {
            this.logger.error('Unknown Exception:', exception);
            details = String(exception);
        }

        // ==================== 404 & 401 ENHANCEMENT ====================
        if (status === HttpStatus.NOT_FOUND) {
            message = `Ruta no encontrada: La URL '${request.url}' no existe para el m\u00E9todo ${request.method}.`;
            errorCode = 'ROUTE_NOT_FOUND';
        } else if (status === HttpStatus.UNAUTHORIZED) {
            // Solo sobrescribir el mensaje si es el genérico o no contiene detalles específicos
            if (message === 'Unauthorized') {
                message = 'Acceso denegado: Credenciales de seguridad inv\u00E1lidas o ausentes (Header X-SECRET).';
            }
            errorCode = 'UNAUTHORIZED_ACCESS';
        }

        // Log para debugging (solo en desarrollo)
        if (process.env.NODE_ENV !== 'production') {
            this.logger.error(
                `[${request.method}] ${request.url} - Status: ${status} - Message: ${message}`,
                exception instanceof Error ? exception.stack : exception
            );
        }

        // Si el cliente acepta HTML (navegador), devolver una "vista" de error creativa
        const acceptHeader = request.headers['accept'] || '';
        if (acceptHeader.includes('text/html') && (status === HttpStatus.NOT_FOUND || status === HttpStatus.UNAUTHORIZED)) {
            const isAuthError = status === HttpStatus.UNAUTHORIZED;
            const title = isAuthError ? 'Acceso Restringido' : 'P\u00E1gina no Encontrada';
            const color = isAuthError ? '#ce1212' : '#2c3e50';
            const bgColor = '#f8f9fa';

            return response.status(status).send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>PROGRAMA PROFE - ${title}</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                            background-color: ${bgColor}; 
                            color: #334155; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                        }
                        .card { 
                            background: white; 
                            padding: 2.5rem; 
                            border-radius: 16px; 
                            box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
                            max-width: 550px; 
                            width: 90%;
                            text-align: center;
                            border-top: 5px solid ${color};
                        }
                        .logo { 
                            font-weight: 800; 
                            font-size: 1.5rem; 
                            color: #1e293b; 
                            margin-bottom: 1.5rem; 
                            letter-spacing: -0.5px;
                        }
                        .logo span { color: #2563eb; }
                        
                        .code { 
                            font-size: 0.85rem; 
                            font-weight: 700; 
                            background: #f1f5f9; 
                            color: #475569; 
                            padding: 0.25rem 0.75rem; 
                            border-radius: 20px; 
                            display: inline-block;
                            margin-bottom: 1rem;
                        }

                        h1 { 
                            color: #0f172a; 
                            font-size: 1.8rem; 
                            margin: 0.5rem 0 1rem 0; 
                        }

                        p { 
                            font-size: 1rem; 
                            line-height: 1.6; 
                            color: #64748b; 
                            margin-bottom: 2rem;
                        }

                        .data-box { 
                            background: #f8fafc; 
                            border: 1px solid #e2e8f0; 
                            padding: 1rem; 
                            border-radius: 8px; 
                            font-family: 'Courier New', monospace;
                            font-size: 0.85rem;
                            color: #334155;
                            text-align: left;
                            margin-bottom: 1.5rem;
                            word-break: break-all;
                        }

                        .footer-text {
                            font-size: 0.8rem;
                            color: #94a3b8;
                            margin-top: 2rem;
                            border-top: 1px solid #f1f5f9;
                            padding-top: 1rem;
                        }

                        .btn { 
                            display: inline-block; 
                            padding: 0.75rem 1.5rem; 
                            background: #1e293b; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: 600;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        }
                        .btn:hover { 
                            background: #334155; 
                            transform: translateY(-1px);
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="logo">PROGRAMA <span>PROFE</span></div>
                        <div class="code">ESTADO: ${status} // HTTP_INFO</div>
                        <h1>${title}</h1>
                        <p>${isAuthError
                    ? 'Has intentado acceder a un punto de enlace protegido. Este sistema requiere una llave de acceso válida (X-SECRET) para interactuar con las APIs del Programa PROFE.'
                    : 'La ruta solicitada no se encuentra disponible en nuestro servidor api-rest.'}</p>
                        
                        <div class="data-box">
                            <strong>MÉTODO:</strong> ${request.method}<br>
                            <strong>RECURSO:</strong> ${request.url}<br>
                            <strong>IP_ORIGEN:</strong> ${request.ip || 'Local'}
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

        // Respuesta estructurada JSON
        response.status(status).json({
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: message,
            errorCode: errorCode,
            details: process.env.NODE_ENV === 'production' ? null : details,
        });
    }

    /**
     * Maneja errores espec\u00EDficos de Prisma
     */
    private handlePrismaError(error: any): {
        status: number;
        message: string;
        details: any;
    } {
        switch (error.code) {
            case 'P2000':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El valor proporcionado es demasiado largo para la columna',
                    details: error.meta,
                };
            case 'P2001':
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'El registro buscado no existe en la base de datos',
                    details: error.meta,
                };
            case 'P2002':
                const field = (error.meta?.target as string[])?.join(', ') || 'campo';
                return {
                    status: HttpStatus.CONFLICT,
                    message: `Ya existe un registro con este ${field}. Debe ser único`,
                    details: { field, constraint: 'unique' },
                };
            case 'P2003':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'La relación con otro registro no es válida o no existe',
                    details: error.meta,
                };
            case 'P2004':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Error de restricción en la base de datos',
                    details: error.meta,
                };
            case 'P2005':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El valor del campo no es válido para el tipo de dato esperado',
                    details: error.meta,
                };
            case 'P2006':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El valor proporcionado no es v\u00E1lido',
                    details: error.meta,
                };
            case 'P2007':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Error de validación de datos',
                    details: error.meta,
                };
            case 'P2008':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error al procesar la consulta en la base de datos',
                    details: error.meta,
                };
            case 'P2009':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error al validar la consulta en la base de datos',
                    details: error.meta,
                };
            case 'P2010':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error en la ejecución de la consulta',
                    details: error.meta,
                };
            case 'P2011':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Falta un valor requerido que no puede ser nulo',
                    details: error.meta,
                };
            case 'P2012':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Falta un valor requerido',
                    details: error.meta,
                };
            case 'P2013':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Falta un argumento requerido',
                    details: error.meta,
                };
            case 'P2014':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'La relación entre modelos es inválida',
                    details: error.meta,
                };
            case 'P2015':
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'No se encontró el registro relacionado',
                    details: error.meta,
                };
            case 'P2016':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Error de interpretación de la consulta',
                    details: error.meta,
                };
            case 'P2017':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Las relaciones entre registros no están conectadas',
                    details: error.meta,
                };
            case 'P2018':
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'No se encontraron los registros conectados requeridos',
                    details: error.meta,
                };
            case 'P2019':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Error en los datos de entrada',
                    details: error.meta,
                };
            case 'P2020':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El valor está fuera del rango permitido',
                    details: error.meta,
                };
            case 'P2021':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'La tabla no existe en la base de datos',
                    details: error.meta,
                };
            case 'P2022':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'La columna no existe en la base de datos',
                    details: error.meta,
                };
            case 'P2023':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Datos inconsistentes en la columna',
                    details: error.meta,
                };
            case 'P2024':
                return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    message: 'Tiempo de espera agotado al conectar con la base de datos',
                    details: error.meta,
                };
            case 'P2025':
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'No se encontró el registro para actualizar o eliminar',
                    details: error.meta,
                };
            case 'P2026':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El motor de base de datos no soporta esta operación',
                    details: error.meta,
                };
            case 'P2027':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Múltiples errores en la base de datos',
                    details: error.meta,
                };
            case 'P2028':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Error en la API de transacciones',
                    details: error.meta,
                };
            case 'P2030':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'No se pudo encontrar un índice de texto completo',
                    details: error.meta,
                };
            case 'P2033':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'El número es demasiado grande para ser representado',
                    details: error.meta,
                };
            case 'P2034':
                return {
                    status: HttpStatus.CONFLICT,
                    message: 'Error en la transacción: conflicto de escritura',
                    details: error.meta,
                };
            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: `Error de base de datos: ${error.code}`,
                    details: error.meta,
                };
        }
    }

    /**
     * Extrae detalles de errores de validación de Prisma
     */
    private extractPrismaValidationDetails(errorMessage: string): string {
        // Extraer información útil del mensaje de error de Prisma
        const lines = errorMessage.split('\n');
        const relevantLines = lines.filter(line =>
            line.includes('Argument') ||
            line.includes('Expected') ||
            line.includes('Got') ||
            line.includes('Field')
        );
        return relevantLines.join(' ').trim() || 'Datos de entrada inválidos';
    }

    /**
     * Traduce mensajes comunes al español
     */
    private translateMessage(message: string): string {
        const translations: Record<string, string> = {
            // HTTP Status
            'Internal server error': 'Error interno del servidor',
            'Not Found': 'Recurso no encontrado',
            'Unauthorized': 'No autorizado. Debe iniciar sesión',
            'Forbidden': 'Acceso denegado. No tiene permisos suficientes',
            'Bad Request': 'Solicitud incorrecta',
            'Conflict': 'Conflicto con el estado actual del recurso',
            'Unprocessable Entity': 'Entidad no procesable',
            'Service Unavailable': 'Servicio no disponible',
            'Gateway Timeout': 'Tiempo de espera agotado',

            // Auth
            'Invalid Credentials': 'Credenciales inv\u00E1lidas. Verifique su usuario y contrase\u00F1a',
            'Invalid credentials': 'Credenciales inv\u00E1lidas. Verifique su usuario y contrase\u00F1a',
            'Token expired': 'Su sesión ha expirado. Por favor, inicie sesión nuevamente',
            'Invalid token': 'Token inv\u00E1lido. Por favor, inicie sesión nuevamente',
            'No token provided': 'No se proporcionó token de autenticación',
            'User not found': 'Usuario no encontrado',

            // Validation
            'Validation failed': 'Error de validación en los datos enviados',
            'Invalid input': 'Datos de entrada inv\u00E1lidos',
            'Missing required field': 'Falta un campo requerido',
            'Invalid email': 'Correo electr\u00F3nico inv\u00E1lido',
            'Invalid password': 'Contrase\u00F1a inv\u00E1lida',
            'uuid is expected': 'se esperaba un formato UUID v\u00E1lido',
            'Invalid UUID': 'Formato UUID inv\u00E1lido',

            // CRUD
            'Resource not found': 'Recurso no encontrado',
            'Already exists': 'El recurso ya existe',
            'Cannot delete': 'No se puede eliminar el recurso',
            'Cannot update': 'No se puede actualizar el recurso',

            // Database
            'Database connection failed': 'Error de conexión con la base de datos',
            'Query failed': 'Error al ejecutar la consulta',
            'Transaction failed': 'Error en la transacción',
        };

        // Buscar traducción exacta
        if (translations[message]) {
            return translations[message];
        }

        // Buscar traducción parcial
        for (const [key, value] of Object.entries(translations)) {
            const regex = new RegExp(key, 'gi');
            if (regex.test(message)) {
                return message.replace(regex, value);
            }
        }

        // Traducciones dinámicas adicionales
        let translated = message;

        // Traducir "Cannot GET /path", "Cannot POST /path", etc.
        const cannotRegex = /Cannot (GET|POST|PUT|DELETE|PATCH) (.+)/i;
        const cannotMatch = translated.match(cannotRegex);
        if (cannotMatch) {
            const method = cannotMatch[1];
            const path = cannotMatch[2];
            return `No se puede encontrar la ruta ${path} para el m\u00E9todo ${method}. Verifique si la URL es correcta`;
        }

        if (translated.toLowerCase().includes('not found')) {
            translated = translated.toLowerCase().replace('not found', 'no encontrado');
        }

        if (translated.toLowerCase().includes('already exists')) {
            translated = translated.toLowerCase().replace('already exists', 'ya existe');
        }

        if (translated.toLowerCase().includes('is required')) {
            translated = translated.toLowerCase().replace('is required', 'es requerido');
        }

        if (translated.toLowerCase().includes('must be')) {
            translated = translated.toLowerCase().replace('must be', 'debe ser');
        }

        if (translated.toLowerCase().includes('invalid')) {
            translated = translated.toLowerCase().replace('invalid', 'inv\u00E1lido');
        }

        return translated;
    }
}
