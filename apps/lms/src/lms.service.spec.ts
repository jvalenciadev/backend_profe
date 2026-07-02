import { Test, TestingModule } from '@nestjs/testing';
import { LmsService } from './lms.service';
import { PrismaService } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import { NotificacionesService } from './notificaciones/notificaciones.service';
import { MailService } from '@app/common';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn(),
}));

describe('LmsService (Blindaje Core - Final)', () => {
  let service: LmsService;

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    profe: { findFirst: jest.fn() },
    token_dispositivo: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    programaInscripcion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    programaDosFacilitador: { findMany: jest.fn(), findFirst: jest.fn() },
    programaDos: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    programaModuloDos: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    programaModulo: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    mod_categoria_calificacion: { findMany: jest.fn(), findFirst: jest.fn() },
    mod_actividad: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    mod_nota_actividad: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    programaDosTurno: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    departamento: { findFirst: jest.fn(), findMany: jest.fn() },
    sede: { findFirst: jest.fn(), findMany: jest.fn() },
    role: { findFirst: jest.fn() },
    userRole: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  };

  const mockJwt = { sign: jest.fn() };
  const mockNoti = { emit: jest.fn() };
  const mockMail = { sendPasswordResetEmail: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LmsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: NotificacionesService, useValue: mockNoti },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<LmsService>(LmsService);
  });

  const bcrypt = require('bcryptjs');

  describe('login', () => {
    beforeEach(() => {
      bcrypt.compare.mockResolvedValue(true);
      mockPrisma.profe.findFirst.mockResolvedValue(null);
      mockJwt.sign.mockReturnValue('tk');
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login('none', 'p')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe permitir acceso a ADMIN sin validar inscripción', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'adm-1',
        estado: 'activo',
        roles: [{ role: { name: 'ADMIN' } }],
      });
      const result = await service.login('admin', 'pass');
      expect(result.access_token).toBe('tk');
    });

    it('debe emitir token para PARTICIPANTE con inscripción INSCRITO', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'activo',
        roles: [{ role: { name: 'PARTICIPANTE' } }],
      });
      const CONFIRMADO_ID = 'adfbbf09-a486-4b79-8fe0-04cf85d83cae';
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        {
          estadoInscripcionId: CONFIRMADO_ID,
          estadoInscripcion: { nombre: 'CONFIRMADO' },
        },
      ]);
      const result = await service.login('user', 'pass');
      expect(result.access_token).toBe('tk');
    });

    it('debe registrar token de dispositivo si se provee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        estado: 'activo',
        roles: [{ role: { name: 'ADMIN' } }],
      });
      mockPrisma.token_dispositivo.findFirst.mockResolvedValue(null);
      mockPrisma.token_dispositivo.create.mockResolvedValue({});
      await service.login('a', 'p', 'tok-123');
      expect(mockPrisma.token_dispositivo.create).toHaveBeenCalled();
    });
  });

  describe('calculateModuloNotaTotal', () => {
    it('debe promediar y ponderar correctamente', async () => {
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        {
          id: 'cat-1',
          config: { peso: 40, nombre: 'A' },
          actividades: [
            {
              puntajeMax: 100,
              notas: [{ nota: 100 }],
              esCalificable: true,
              estado: 'activo',
            },
          ],
        },
        {
          id: 'cat-2',
          config: { peso: 60, nombre: 'B' },
          actividades: [
            {
              puntajeMax: 100,
              notas: [{ nota: 50 }],
              esCalificable: true,
              estado: 'activo',
            },
          ],
        },
      ]);
      const result = await service.calculateModuloNotaTotal('u1', 'm1');
      // 40% de 100 = 40. 60% de 50 = 30. Total = 70.
      expect(result.total).toBe(70);
    });
  });

  describe('getMisCursos', () => {
    it('debe retornar objeto con arrays vacíos si no hay nada', async () => {
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([]);
      mockPrisma.programaDosFacilitador.findMany.mockResolvedValue([]);
      const result = await service.getMisCursos('u1');
      expect(result.estudiante).toEqual([]);
      expect(result.facilitador).toEqual([]);
    });
  });

  describe('getEstudiantesPorCurso', () => {
    it('debe hidratar nombreCompleto', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'm1',
        programaDos: { id: 'p1' },
      });
      mockPrisma.programaInscripcion.findMany.mockResolvedValue([
        { persona: { id: 'p1', nombre: 'JUAN', apellidos: 'PEREZ' } },
      ]);
      const result = await service.getEstudiantesPorCurso('m1', 'g');
      expect(result[0].persona.nombreCompleto).toBe('JUAN PEREZ');
    });
  });
});
