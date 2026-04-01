import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { RecordatoriosService } from './recordatorios.service';
import { RecordatoriosController } from './recordatorios.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [DatabaseModule, NotificacionesModule],
  controllers: [RecordatoriosController],
  providers: [RecordatoriosService],
  exports: [RecordatoriosService],
})
export class RecordatoriosModule {}
