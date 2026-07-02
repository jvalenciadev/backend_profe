import { Test, TestingModule } from '@nestjs/testing';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '@app/database';

// Mock completo de firebase-admin para evitar dependencias externas
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  messaging: jest.fn().mockReturnValue({
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
    }),
  }),
}));

// Mock fs para evitar lectura de archivos
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
}));

describe('NotificacionesService (Blindaje Completo)', () => {
  let service: NotificacionesService;

  const mockPrisma = {
    mod_notificacion: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    token_dispositivo: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  // ─── getNotificaciones ──────────────────────────────────────────────
  describe('getNotificaciones', () => {
    it('debe retornar lista vacía si el usuario no tiene notificaciones', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([]);
      const result = await service.getNotificaciones('user-1');
      expect(result).toEqual([]);
    });

    it('debe limpiar tipo _1H a URGENTE', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([
        {
          id: 'n1',
          tipo: 'ENTREGA_1H',
          titulo: 'Test',
          mensaje: 'Urgente',
          leida: false,
        },
      ]);
      const result = await service.getNotificaciones('user-1');
      expect(result[0].tipo).toBe('URGENTE');
    });

    it('debe limpiar tipo _1D a ALERTA', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([
        {
          id: 'n2',
          tipo: 'TAREA_1D',
          titulo: 'Alerta',
          mensaje: 'En 1 día',
          leida: false,
        },
      ]);
      const result = await service.getNotificaciones('user-1');
      expect(result[0].tipo).toBe('ALERTA');
    });

    it('debe limpiar tipo _5D a RECORDATORIO', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([
        {
          id: 'n3',
          tipo: 'TAREA_5D',
          titulo: 'Recordatorio',
          mensaje: 'En 5 días',
          leida: false,
        },
      ]);
      const result = await service.getNotificaciones('user-1');
      expect(result[0].tipo).toBe('RECORDATORIO');
    });

    it('debe mantener tipo NUEVA_ACTIVIDAD sin cambios', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([
        {
          id: 'n4',
          tipo: 'NUEVA_ACTIVIDAD',
          titulo: 'Nueva',
          mensaje: 'Actividad',
          leida: false,
        },
      ]);
      const result = await service.getNotificaciones('user-1');
      expect(result[0].tipo).toBe('NUEVA_ACTIVIDAD');
    });

    it('debe mapear ENTREGA_CALIFICADA a ACTIVIDAD_CALIFICADA', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([
        {
          id: 'n5',
          tipo: 'ENTREGA_CALIFICADA',
          titulo: 'Calificada',
          mensaje: 'Tu tarea fue calificada',
          leida: false,
        },
      ]);
      const result = await service.getNotificaciones('user-1');
      expect(result[0].tipo).toBe('ACTIVIDAD_CALIFICADA');
    });

    it('debe consultar las últimas 50 notificaciones ordenadas por fecha', async () => {
      mockPrisma.mod_notificacion.findMany.mockResolvedValue([]);
      await service.getNotificaciones('user-test');
      expect(mockPrisma.mod_notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-test' },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ─── emit ────────────────────────────────────────────────────────────
  describe('emit', () => {
    it('debe crear la notificación en BD y retornarla', async () => {
      const notifData = {
        userId: 'user-1',
        titulo: 'Nueva Tarea',
        mensaje: 'Se asignó una nueva tarea',
        tipo: 'NUEVA_ACTIVIDAD',
        linkRef: '/modulo/123',
      };
      const mockRecord = { id: 'notif-1', ...notifData };
      mockPrisma.mod_notificacion.create.mockResolvedValue(mockRecord);
      mockPrisma.token_dispositivo.findMany.mockResolvedValue([]);

      const result = await service.emit(notifData);
      expect(result.id).toBe('notif-1');
      expect(mockPrisma.mod_notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            tipo: 'NUEVA_ACTIVIDAD',
          }),
        }),
      );
    });

    it('debe enviar push notification si hay devices registrados', async () => {
      const admin = require('firebase-admin');
      mockPrisma.mod_notificacion.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.token_dispositivo.findMany.mockResolvedValue([
        { token: 'device-token-abc123' },
      ]);

      await service.emit({
        userId: 'user-1',
        titulo: 'Test Push',
        mensaje: 'Mensaje',
        tipo: 'URGENTE',
      });

      expect(admin.messaging).toHaveBeenCalled();
    });

    it('debe ignorar tokens nulos o muy cortos al enviar push', async () => {
      mockPrisma.mod_notificacion.create.mockResolvedValue({ id: 'n2' });
      mockPrisma.token_dispositivo.findMany.mockResolvedValue([
        { token: null },
        { token: 'ab' }, // token demasiado corto
      ]);

      // No debe lanzar error aunque los tokens sean inválidos
      await expect(
        service.emit({
          userId: 'u',
          titulo: 'T',
          mensaje: 'M',
          tipo: 'URGENTE',
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── emitBulk ────────────────────────────────────────────────────────
  describe('emitBulk', () => {
    it('debe retornar temprano si el listado de userIds está vacío', async () => {
      await service.emitBulk({
        userIds: [],
        titulo: 'T',
        mensaje: 'M',
        tipo: 'TIPO',
      });
      expect(mockPrisma.mod_notificacion.createMany).not.toHaveBeenCalled();
    });

    it('debe realizar inserción masiva en BD y buscar tokens de dispositivos', async () => {
      mockPrisma.mod_notificacion.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.token_dispositivo.findMany.mockResolvedValue([
        { token: 'token-bulk-1' },
      ]);

      await service.emitBulk({
        userIds: ['u1', 'u2'],
        titulo: 'Bulk Title',
        mensaje: 'Bulk Msg',
        tipo: 'BULK_TYPE',
        linkRef: '/link',
      });

      expect(mockPrisma.mod_notificacion.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'u1',
            titulo: 'Bulk Title',
            mensaje: 'Bulk Msg',
            tipo: 'BULK_TYPE',
            linkRef: '/link',
          },
          {
            userId: 'u2',
            titulo: 'Bulk Title',
            mensaje: 'Bulk Msg',
            tipo: 'BULK_TYPE',
            linkRef: '/link',
          },
        ],
      });

      expect(mockPrisma.token_dispositivo.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] } },
      });
    });
  });

  // ─── markAsRead ─────────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('debe marcar una notificación como leída', async () => {
      mockPrisma.mod_notificacion.update.mockResolvedValue({
        id: 'n1',
        leida: true,
      });
      const result = await service.markAsRead('n1');
      expect(mockPrisma.mod_notificacion.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { leida: true },
      });
      expect(result.leida).toBe(true);
    });
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('debe marcar todas las notificaciones del usuario como leídas', async () => {
      mockPrisma.mod_notificacion.updateMany.mockResolvedValue({ count: 5 });
      const result = await service.markAllAsRead('user-1');
      expect(mockPrisma.mod_notificacion.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', leida: false },
        data: { leida: true },
      });
      expect(result.count).toBe(5);
    });
  });

  // ─── eliminar ───────────────────────────────────────────────────────
  describe('eliminar', () => {
    it('debe eliminar una notificación por ID', async () => {
      mockPrisma.mod_notificacion.delete.mockResolvedValue({ id: 'n1' });
      await service.eliminar('n1');
      expect(mockPrisma.mod_notificacion.delete).toHaveBeenCalledWith({
        where: { id: 'n1' },
      });
    });
  });
});
