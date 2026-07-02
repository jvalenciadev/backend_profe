import { Test, TestingModule } from '@nestjs/testing';
import { RecordatoriosService } from './recordatorios.service';
import { PrismaService } from '@app/database';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { addHours, addDays, subHours } from 'date-fns';

describe('RecordatoriosService (Blindaje Cron)', () => {
  let service: RecordatoriosService;

  const mockPrisma = {
    mod_actividad: { findMany: jest.fn() },
    programaModuloDos: { findUnique: jest.fn() },
    programaModulo: { findUnique: jest.fn() },
    programaInscripcion: { findMany: jest.fn() },
    mod_notificacion: { findFirst: jest.fn() },
    mod_entrega: { findFirst: jest.fn() },
    mod_intento: { findFirst: jest.fn() },
    mod_foro_post: { findFirst: jest.fn() },
  };

  const mockNoti = {
    emit: jest.fn().mockResolvedValue({ id: 'noti-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordatoriosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNoti },
      ],
    }).compile();

    service = module.get<RecordatoriosService>(RecordatoriosService);
  });

  describe('handleCronReminders', () => {
    it('debe ejecutar el flujo de verificación sin lanzar errores', async () => {
      mockPrisma.mod_actividad.findMany.mockResolvedValue([]);
      await expect(service.handleCronReminders()).resolves.not.toThrow();
    });
  });

  describe('checkActivityDeadlines (Lógica de Tiempos)', () => {
    const buildAct = (fechaFin: Date, tipo = 'TAREA') => ({
      id: 'act-1',
      titulo: 'Test Act',
      tipo,
      fechaFin,
      unidad: { moduloId: 'mod-1', moduloMaestroId: null },
    });

    it('debe generar threshold 1H si falta menos de una hora', async () => {
      const soon = addHours(new Date(), 0.5);
      mockPrisma.mod_actividad.findMany.mockResolvedValue([buildAct(soon)]);
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        programaDosId: 'p-1',
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { personaId: 'u-1' },
      ]);
      mockPrisma.mod_notificacion.findFirst.mockResolvedValue(null);
      mockPrisma.mod_entrega.findFirst.mockResolvedValue(null);

      await service.handleCronReminders();

      expect(mockNoti.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: expect.stringContaining('1H'),
          titulo: expect.stringContaining('URGENTE'),
        }),
      );
    });

    it('debe generar threshold 1D si falta menos de un día', async () => {
      const tomorrow = addHours(new Date(), 12);
      mockPrisma.mod_actividad.findMany.mockResolvedValue([buildAct(tomorrow)]);
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        programaDosId: 'p-1',
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { personaId: 'u-1' },
      ]);
      mockPrisma.mod_notificacion.findFirst.mockResolvedValue(null);
      mockPrisma.mod_entrega.findFirst.mockResolvedValue(null);

      await service.handleCronReminders();

      expect(mockNoti.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: expect.stringContaining('1D'),
          titulo: expect.stringContaining('ALERTA'),
        }),
      );
    });

    it('debe generar threshold 5D si falta menos de 5 días', async () => {
      const nextWeek = addDays(new Date(), 3);
      mockPrisma.mod_actividad.findMany.mockResolvedValue([buildAct(nextWeek)]);
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        programaDosId: 'p-1',
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { personaId: 'u-1' },
      ]);
      mockPrisma.mod_notificacion.findFirst.mockResolvedValue(null);
      mockPrisma.mod_entrega.findFirst.mockResolvedValue(null);

      await service.handleCronReminders();

      expect(mockNoti.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: expect.stringContaining('5D'),
          titulo: expect.stringContaining('RECORDATORIO'),
        }),
      );
    });
  });

  describe('hasSubmitted (Detección de entregas)', () => {
    const setupNotifyMocks = (tipo: string) => {
      const now = addHours(new Date(), 0.5);
      mockPrisma.mod_actividad.findMany.mockResolvedValue([
        {
          id: 'act-1',
          titulo: 'T',
          tipo,
          fechaFin: now,
          unidad: { moduloId: 'm-1' },
        },
      ]);
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        programaDosId: 'p-1',
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { personaId: 'u-1' },
      ]);
      mockPrisma.mod_notificacion.findFirst.mockResolvedValue(null);
    };

    it('debe omitir recordatorio si la TAREA ya fue entregada', async () => {
      setupNotifyMocks('TAREA');
      mockPrisma.mod_entrega.findFirst.mockResolvedValue({ id: 'ent-1' });

      await service.handleCronReminders();
      expect(mockNoti.emit).not.toHaveBeenCalled();
    });

    it('debe omitir recordatorio si el CUESTIONARIO ya fue finalizado', async () => {
      setupNotifyMocks('CUESTIONARIO');
      mockPrisma.mod_intento.findFirst.mockResolvedValue({
        id: 'int-1',
        estado: 'finalizado',
      });

      await service.handleCronReminders();
      expect(mockNoti.emit).not.toHaveBeenCalled();
    });

    it('debe omitir recordatorio si ya participó en el FORO', async () => {
      setupNotifyMocks('FORO');
      mockPrisma.mod_foro_post.findFirst.mockResolvedValue({ id: 'post-1' });

      await service.handleCronReminders();
      expect(mockNoti.emit).not.toHaveBeenCalled();
    });
  });

  describe('Control de Duplicidad', () => {
    it('debe omitir si ya existe una notificación con el mismo tag', async () => {
      const soon = addHours(new Date(), 0.5);
      mockPrisma.mod_actividad.findMany.mockResolvedValue([
        {
          id: 'act-1',
          titulo: 'T',
          tipo: 'TAREA',
          fechaFin: soon,
          unidad: { moduloId: 'm-1' },
        },
      ]);
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        programaDosId: 'p-1',
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { personaId: 'u-1' },
      ]);
      // Ya existe la notif
      mockPrisma.mod_notificacion.findFirst.mockResolvedValue({
        id: 'prev-notif',
      });

      await service.handleCronReminders();
      expect(mockNoti.emit).not.toHaveBeenCalled();
    });
  });
});
