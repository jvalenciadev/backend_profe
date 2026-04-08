import {
  Controller,
  Param,
  Post,
  Body,
  Get,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, Public, CurrentUser } from '@app/common';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Credenciales inválidas. Verifique su usuario y contraseña',
      );
    }

    return this.authService.login(user, dto.tokenDispositivo);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new UnauthorizedException();
    }
    return this.authService.getProfile(user.id);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('impersonate/:userId')
  @UseGuards(JwtAuthGuard)
  async impersonate(
    @Param('userId') userId: string,
    @CurrentUser() admin: any,
  ) {
    // Verificar que el usuario que llama es ADMIN o RESPONSABLE
    const roles = admin.roles || [];
    const hasPermission = roles.some((r: string) => {
      const role = r.toUpperCase();
      return role.includes('ADMIN') || role.includes('RESPONSABLE');
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tiene permisos de nivel administrativo para suplantar identidades',
      );
    }

    return this.authService.impersonate(userId);
  }
}
