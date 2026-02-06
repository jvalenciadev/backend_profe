import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        tenant: true
      }
    });

    if (user && await bcrypt.compare(pass, user.password)) {
      // Return user without password
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Basic payload, needs refinement for roles/sedes
    const payload = {
      username: user.username,
      sub: user.id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : null
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' })
    };
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username, tenantId: payload.tenantId };
  }
}
