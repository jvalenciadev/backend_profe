import { Test, TestingModule } from '@nestjs/testing';
import { AsistenciaService } from './asistencia.service';
import { PrismaService } from '@app/database';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';

// Helpers para generar un QR token válido en tests
const QR_SECRET = 'qr_asistencia_secret_2024_profe';
function signPayload(data: string): string {
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
}
function buildValidToken(
  sesionId = 'sesion-1',
  turnoId = 'turno-1',
  sedeId = 'sede-1',
  offsetMs = 60000,
): string {
  const expiry = Date.now() + offsetMs;
  const payload = `${sesionId}|${turnoId}|${sedeId}|${expiry}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

describe('AsistenciaService (Blindaje Completo)', () => {
  let service: AsistenciaService;

  const mockPrisma = {
    mod_asistencia: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    mod_asistencia_reg: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    programaDosFacilitador: { findFirst: jest.fn() },
    programaModulo: { findUnique: jest.fn() },
    programaModuloDos: { findUnique: jest.fn() },
    programaInscripcion: { findFirst: jest.fn(), findMany: jest.fn() },
    programaDosTurno: { findMany: jest.fn(), findUnique: jest.fn() },
    mod_actividad: { findUnique: jest.fn() },
    mod_nota_actividad: { upsert: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AsistenciaService>(AsistenciaService);
  });

  // ─── generateQrToken ──────────────────────────────────────────────
  describe('generateQrToken', () => {
    it('debería lanzar NotFoundException si la sesión no existe', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue(null);
      await expect(
        service.generateQrToken('user-1', 'sesion-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el usuario no es facilitador', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        moduloMaestroId: null,
        turnoId: null,
        modulo: null,
        moduloMaestro: null,
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue(null);
      await expect(
        service.generateQrToken('user-sin-permisos', 'ses-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería generar token QR válido si el usuario es facilitador', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        moduloMaestroId: null,
        turnoId: 'turno-1',
        modulo: { programaDos: { sedeId: 'sede-1' } },
        moduloMaestro: null,
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({
        id: 'fac-1',
      });

      const result = await service.generateQrToken('facilitador-1', 'ses-1');

      expect(result.token).toBeDefined();
      expect(result.sesionId).toBe('ses-1');
      expect(result.expiry).toBeGreaterThan(Date.now());
      expect(result.expiresInMinutes).toBe(60);
    });
  });

  // ─── marcarAsistenciaQR ───────────────────────────────────────────
  describe('marcarAsistenciaQR', () => {
    it('debería lanzar BadRequestException si el token QR es inválido', async () => {
      await expect(
        service.marcarAsistenciaQR('user-1', 'token_invalido_base64!!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si el QR ha expirado', async () => {
      // Token con expiry en el pasado
      const expiredToken = buildValidToken(
        'ses-1',
        'turno-1',
        'sede-1',
        -10000,
      );
      await expect(
        service.marcarAsistenciaQR('user-1', expiredToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar NotFoundException si la sesión del QR no existe en BD', async () => {
      const validToken = buildValidToken();
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue(null);
      await expect(
        service.marcarAsistenciaQR('user-1', validToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el estudiante no está inscrito en el turno', async () => {
      const validToken = buildValidToken('ses-1', 'turno-1', 'sede-1');
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        modulo: { programaDos: { id: 'prog-1' } },
      });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue(null);
      await expect(
        service.marcarAsistenciaQR('user-1', validToken),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería retornar alreadyRegistered=true si la asistencia ya existe', async () => {
      const validToken = buildValidToken('ses-1', 'turno-1', 'sede-1');
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        actividadId: null,
        modulo: { programaDos: { id: 'prog-1' } },
      });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue({
        id: 'ins-1',
      });
      mockPrisma.mod_asistencia_reg.findFirst.mockResolvedValue({
        id: 'reg-1',
      });

      const result = await service.marcarAsistenciaQR('user-1', validToken);
      expect(result.alreadyRegistered).toBe(true);
    });

    it('debería registrar asistencia exitosamente (nuevo registro)', async () => {
      const validToken = buildValidToken('ses-1', 'turno-1', 'sede-1');
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        actividadId: null,
        modulo: { programaDos: { id: 'prog-1' } },
      });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue({
        id: 'ins-1',
      });
      mockPrisma.mod_asistencia_reg.findFirst.mockResolvedValue(null);
      mockPrisma.mod_asistencia_reg.create.mockResolvedValue({ id: 'reg-new' });

      const result = await service.marcarAsistenciaQR('user-1', validToken);
      expect(result.success).toBe(true);
      expect(result.alreadyRegistered).toBe(false);
      expect(mockPrisma.mod_asistencia_reg.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'P', userId: 'user-1' }),
        }),
      );
    });
  });

  // ─── getSesionesModulo ────────────────────────────────────────────
  describe('getSesionesModulo', () => {
    it('debería retornar sesiones con turnoNombre hidratado', async () => {
      mockPrisma.mod_asistencia.findMany.mockResolvedValue([
        {
          id: 'ses-1',
          turnoId: 'turno-1',
          _count: { registros: 5 },
          modulo: null,
          moduloMaestro: null,
          actividad: null,
        },
      ]);
      mockPrisma.programaDosTurno.findUnique.mockResolvedValue({
        turnoConfig: { nombre: 'Turno Mañana' },
      });

      const result = await service.getSesionesModulo('mod-1');
      expect(result).toHaveLength(1);
      expect(result[0].turnoNombre).toBe('Turno Mañana');
    });

    it('debería retornar turnoNombre=Global si no hay turnoId', async () => {
      mockPrisma.mod_asistencia.findMany.mockResolvedValue([
        {
          id: 'ses-2',
          turnoId: null,
          _count: { registros: 0 },
          modulo: null,
          moduloMaestro: null,
          actividad: null,
        },
      ]);

      const result = await service.getSesionesModulo('mod-2');
      expect(result[0].turnoNombre).toBe('Global');
    });
  });

  // ─── crearSesion ──────────────────────────────────────────────────
  describe('crearSesion', () => {
    it('debería lanzar NotFoundException si el módulo no existe', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue(null);
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);
      await expect(
        service.crearSesion('user-1', 'mod-999', { fecha: '2024-01-01' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no es facilitador', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'mod-1',
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue(null);
      await expect(
        service.crearSesion('user-sin-permisos', 'mod-1', {
          fecha: '2024-01-01',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería retornar sesión existente si ya hay una para esa fecha y turno', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'mod-1',
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({
        id: 'fac-1',
        turnoId: 'turno-1',
      });
      mockPrisma.mod_asistencia.findFirst.mockResolvedValue({
        id: 'existing-ses',
      });

      const result = await service.crearSesion('facilitador-1', 'mod-1', {
        fecha: '2024-01-15',
        turnoId: 'turno-1',
      });
      expect(result.id).toBe('existing-ses');
      expect(mockPrisma.mod_asistencia.create).not.toHaveBeenCalled();
    });

    it('debería crear nueva sesión si no existe una para esa fecha', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'mod-1',
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({
        id: 'fac-1',
        turnoId: 'turno-1',
      });
      mockPrisma.mod_asistencia.findFirst.mockResolvedValue(null);
      mockPrisma.mod_asistencia.create.mockResolvedValue({ id: 'new-ses' });

      const result = await service.crearSesion('facilitador-1', 'mod-1', {
        fecha: '2024-02-20',
        turnoId: 'turno-1',
      });
      expect(result.id).toBe('new-ses');
      expect(mockPrisma.mod_asistencia.create).toHaveBeenCalled();
    });
  });

  // ─── registrarAsistencia ──────────────────────────────────────────
  describe('registrarAsistencia', () => {
    it('debería lanzar NotFoundException si la sesión no existe', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue(null);
      await expect(
        service.registrarAsistencia('user-1', 'ses-999', { registros: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si no tiene permisos de facilitador', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        moduloMaestroId: null,
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue(null);
      await expect(
        service.registrarAsistencia('user-1', 'ses-1', { registros: [] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería registrar asistencia y retornar success=true', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        moduloMaestroId: null,
        actividadId: null,
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({
        id: 'fac-1',
      });
      mockPrisma.mod_asistencia_reg.upsert.mockResolvedValue({});

      const registros = [
        { registroId: null, userId: 'student-1', estado: 'P', observacion: '' },
      ];
      const result = await service.registrarAsistencia('fac-1', 'ses-1', {
        registros,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.mod_asistencia_reg.upsert).toHaveBeenCalledTimes(1);
    });

    it('debería sincronizar notas con las asistencias (P=100%, T=50%, F=0%)', async () => {
      mockPrisma.mod_asistencia.findUnique.mockResolvedValue({
        id: 'ses-1',
        moduloId: 'mod-1',
        moduloMaestroId: null,
        actividadId: 'act-1',
      });
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({
        id: 'fac-1',
      });
      mockPrisma.mod_asistencia_reg.upsert.mockResolvedValue({});
      mockPrisma.mod_actividad.findUnique.mockResolvedValue({
        puntajeMax: 100,
      });
      mockPrisma.mod_nota_actividad.upsert.mockResolvedValue({});

      const registros = [
        { registroId: null, userId: 'student-p', estado: 'P', observacion: '' },
        { registroId: null, userId: 'student-t', estado: 'T', observacion: '' },
        { registroId: null, userId: 'student-f', estado: 'F', observacion: '' },
      ];
      await service.registrarAsistencia('fac-1', 'ses-1', { registros });

      expect(mockPrisma.mod_nota_actividad.upsert).toHaveBeenCalledTimes(3);
      // Verificar que P = 100 pts, T = 50 pts, F = 0 pts
      const calls = mockPrisma.mod_nota_actividad.upsert.mock.calls;
      expect(calls[0][0].create.nota).toBe(100);
      expect(calls[1][0].create.nota).toBe(50);
      expect(calls[2][0].create.nota).toBe(0);
    });
  });

  // ─── getAsistenciaEstudiante ──────────────────────────────────────
  describe('getAsistenciaEstudiante', () => {
    it('debería retornar sesiones con estado F si el estudiante no tiene registro', async () => {
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue({
        turnoId: 'turno-1',
      });
      mockPrisma.mod_asistencia.findMany.mockResolvedValue([
        { id: 'ses-1', fecha: new Date(), esPresencial: true, registros: [] },
      ]);

      const result = await service.getAsistenciaEstudiante(
        'student-1',
        'mod-1',
      );
      expect(result[0].estado).toBe('F'); // "F" = Falta por defecto
    });

    it('debería retornar el estado real del registro si el estudiante asistió', async () => {
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue({
        turnoId: null,
      });
      mockPrisma.mod_asistencia.findMany.mockResolvedValue([
        {
          id: 'ses-1',
          fecha: new Date(),
          esPresencial: true,
          registros: [{ estado: 'P', userId: 'student-1' }],
        },
      ]);

      const result = await service.getAsistenciaEstudiante(
        'student-1',
        'mod-1',
      );
      expect(result[0].estado).toBe('P');
    });
  });
});
