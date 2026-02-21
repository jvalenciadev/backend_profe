import { Controller, Post, Body, Get, UseGuards, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, Public } from '@app/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: any) {
    if (!body.username || !body.password) {
      throw new BadRequestException('Usuario y contrase\u00F1a son requeridos');
    }

    const user = await this.authService.validateUser(body.username, body.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inv\u00E1lidas. Verifique su usuario y contrase\u00F1a');
    }

    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException();
    }
    return this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) throw new BadRequestException('El correo es obligatorio');
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    const { token, password } = body;
    if (!token || !password) throw new BadRequestException('Token y nueva contrase\u00F1a son requeridos');
    return this.authService.resetPassword(token, password);
  }
}
