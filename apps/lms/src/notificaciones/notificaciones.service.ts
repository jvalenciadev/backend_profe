import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Inicializar Firebase Admin si no está listo
if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (serviceAccountPath && fs.existsSync(path.resolve(process.cwd(), serviceAccountPath))) {
      const fullPath = path.resolve(process.cwd(), serviceAccountPath);
      console.log('[FCM Backend] Usando credenciales de: ' + fullPath);
      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.log('[FCM Backend] No se encontró GOOGLE_APPLICATION_CREDENTIALS. Usando default.');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (err) {
    console.error('Firebase Admin Init Error:', err);
  }
}

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificaciones(userId: string) {
    const data = await this.prisma.mod_notificacion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Limpiar tipos para el frontend (Soporte para URGENTE, ALERTA, RECORDATORIO)
    return data.map((n) => ({
      ...n,
      tipo: this.cleanTipo(n.tipo),
    }));
  }

  private cleanTipo(tipo: string): string {
    const raw = tipo.toUpperCase();
    if (raw.includes('_1H')) return 'URGENTE';
    if (raw.includes('_1D')) return 'ALERTA';
    if (raw.includes('_5D')) return 'RECORDATORIO';
    if (raw.startsWith('RECORDATORIO')) return 'RECORDATORIO';
    if (raw === 'NUEVA_ACTIVIDAD') return 'NUEVA_ACTIVIDAD';
    if (raw === 'ENTREGA_CALIFICADA' || raw === 'ACTIVIDAD_CALIFICADA')
      return 'ACTIVIDAD_CALIFICADA';
    return tipo; // fallback
  }

  async emit(data: {
    userId: string;
    titulo: string;
    mensaje: string;
    tipo: string;
    linkRef?: string;
  }) {
    // 1. Crear en la base de datos local
    const record = await this.prisma.mod_notificacion.create({
      data: {
        userId: data.userId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo,
        linkRef: data.linkRef,
      },
    });

    // 2. Enviar PUSH NOTIFICATION a todos los dispositivos registrados del usuario
    try {
      const devices = await this.prisma.token_dispositivo.findMany({
        where: { userId: data.userId },
      });

      const tokens = devices
        .map((d) => d.token)
        .filter((t): t is string => t !== null && t.length > 5);

      if (tokens.length > 0) {
        // Enviar a múltiples dispositivos (multicast)
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: data.titulo,
            body: data.mensaje,
          },
          data: {
            tipo: data.tipo,
            linkRef: data.linkRef || '',
          },
        });
        console.log(`[FCM] Notification sent to ${response.successCount} devices for user ${data.userId} (${response.failureCount} failed)`);
      }
    } catch (e) {
      console.error('[FCM] Error enviando notificacion PUSH multicontrol:', e);
    }

    return record;
  }

  async emitBulk(data: {
    userIds: string[];
    titulo: string;
    mensaje: string;
    tipo: string;
    linkRef?: string;
  }) {
    if (!data.userIds || data.userIds.length === 0) return;

    // 1. Crear en la base de datos local en lote
    await this.prisma.mod_notificacion.createMany({
      data: data.userIds.map((userId) => ({
        userId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo,
        linkRef: data.linkRef,
      })),
    });

    // 2. Enviar PUSH NOTIFICATION a todos los dispositivos registrados del lote
    try {
      const devices = await this.prisma.token_dispositivo.findMany({
        where: { userId: { in: data.userIds } },
      });

      const tokens = devices
        .map((d) => d.token)
        .filter((t): t is string => t !== null && t.length > 5);

      if (tokens.length > 0) {
        // Enviar a múltiples dispositivos (multicast) en lotes de 500
        const chunkSize = 500;
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const tokenChunk = tokens.slice(i, i + chunkSize);
          await admin.messaging().sendEachForMulticast({
            tokens: tokenChunk,
            notification: {
              title: data.titulo,
              body: data.mensaje,
            },
            data: {
              tipo: data.tipo,
              linkRef: data.linkRef || '',
            },
          }).catch((err) => {
            console.error('[FCM] Error en lote multicast de emitBulk:', err);
          });
        }
      }
    } catch (e) {
      console.error('[FCM] Error enviando notificaciones PUSH bulk:', e);
    }
  }

  async markAsRead(id: string) {
    return this.prisma.mod_notificacion.update({
      where: { id },
      data: { leida: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.mod_notificacion.updateMany({
      where: { userId, leida: false },
      data: { leida: true },
    });
  }

  async eliminar(id: string) {
    return this.prisma.mod_notificacion.delete({ where: { id } });
  }
}
