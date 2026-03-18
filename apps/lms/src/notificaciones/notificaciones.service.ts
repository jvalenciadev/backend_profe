import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class NotificacionesService {
    constructor(private readonly prisma: PrismaService) { }

    async getNotificaciones(userId: string) {
        return this.prisma.mod_notificacion.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }

    async emit(data: { userId: string, titulo: string, mensaje: string, tipo: string, linkRef?: string }) {
        return this.prisma.mod_notificacion.create({
            data: {
                userId: data.userId,
                titulo: data.titulo,
                mensaje: data.mensaje,
                tipo: data.tipo,
                linkRef: data.linkRef
            }
        });
    }

    async markAsRead(id: string) {
        return this.prisma.mod_notificacion.update({
            where: { id },
            data: { leida: true }
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.mod_notificacion.updateMany({
            where: { userId, leida: false },
            data: { leida: true }
        });
    }

    async eliminar(id: string) {
        return this.prisma.mod_notificacion.delete({ where: { id } });
    }
}
