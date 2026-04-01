import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  async getMyNotifications(@Request() req: any) {
    return this.notificacionesService.getNotificaciones(req.user.id);
  }

  @Patch(':id/leer')
  async read(@Param('id') id: string) {
    return this.notificacionesService.markAsRead(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.notificacionesService.eliminar(id);
  }

  @Post('leer-todo')
  async readAll(@Request() req: any) {
    return this.notificacionesService.markAllAsRead(req.user.id);
  }
}
