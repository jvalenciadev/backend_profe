import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    console.log('Validating user:', username);
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        tenant: true,
        roles: {
          include: { role: true }
        },
        sedes: {
          include: { sede: true }
        }
      }
    });

    if (!user) {
      console.log('User not found in database:', username);
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    console.log('Password match:', isMatch);

    if (user && isMatch) {
      // Return user without password
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Extract roles
    const roles = user.roles?.map((ur: any) => ur.role.name) || [];
    const sedesIds = user.sedes?.map((us: any) => us.sedeId.toString()) || [];

    const payload = {
      username: user.username,
      sub: user.id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      roles: roles,
      sedes: sedesIds
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), // Simple refresh for now
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.correo,
        tenant: user.tenant,
        roles: roles
      }
    };
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      tenantId: payload.tenantId,
      roles: payload.roles,
      sedes: payload.sedes
    };
  }
}
