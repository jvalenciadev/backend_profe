import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { DatabaseModule } from '@app/database';

@Module({
    imports: [DatabaseModule],
    controllers: [NotificacionesController],
    providers: [NotificacionesService],
    exports: [NotificacionesService]
})
export class NotificacionesModule { }
