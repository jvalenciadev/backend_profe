import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Only permit PARTICIPANTE and FACILITADOR roles for LMS
    const lmsRoles = ['PARTICIPANTE', 'FACILITADOR', 'ADMIN']; // Admin can usually see everything
    const hasRole = payload.roles?.some((role) => lmsRoles.includes(role));

    if (!hasRole) {
      throw new UnauthorizedException('Su rol no tiene acceso al Aula Virtual');
    }

    return {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
