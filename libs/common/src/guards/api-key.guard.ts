import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-secret'];
        const secretKey = this.configService.get<string>('API_SECRET_KEY') || 'profe_secret_2026';

        if (apiKey !== secretKey) {
            throw new UnauthorizedException('Acceso no autorizado: Header X-SECRET inválido o ausente');
        }

        return true;
    }
}
