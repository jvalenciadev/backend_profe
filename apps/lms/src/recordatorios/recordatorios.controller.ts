import { Controller, Post, UseGuards } from '@nestjs/common';
import { RecordatoriosService } from './recordatorios.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('recordatorios')
@UseGuards(JwtAuthGuard)
export class RecordatoriosController {
  constructor(private readonly recordatoriosService: RecordatoriosService) {}

  @Post('sincronizar')
  async forceSync() {
    await this.recordatoriosService.handleCronReminders();
    return { message: 'Sincronización de recordatorios ejecutada con éxito.' };
  }
}
