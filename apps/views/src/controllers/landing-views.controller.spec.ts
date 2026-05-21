import { Test, TestingModule } from '@nestjs/testing';
import { LandingViewsController } from './landing-views.controller';
import { PrismaService } from '@app/database';
import { MailService, UploadConfigService } from '@app/common';
import { BadRequestException } from '@nestjs/common';

import * as bcrypt from 'bcryptjs';

// Mock Senior de bcrypt corregido para todo el archivo
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn(),
}));

describe('LandingViewsController (Fase: Vistas Públicas - Blindaje Masivo)', () => {

  let controller: LandingViewsController;
  let prisma: PrismaService;

  // Mock Senior de Prisma para múltiples tablas
  const mockPrisma = {
    profe: { findFirst: jest.fn() },
    evento: { findMany: jest.fn() },
    programaDos: { findMany: jest.fn(), findUnique: jest.fn() },
    comunicado: { findMany: jest.fn() },
    blog: { findMany: jest.fn() },
    galeria: { findMany: jest.fn() },
    sede: { findMany: jest.fn() },
    cargo: { findMany: jest.fn() },
    mapPersona: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    programaInscripcion: { findFirst: jest.fn(), create: jest.fn() },
    programa_inscripcion_estado: { findFirst: jest.fn() },
    userRole: { findFirst: jest.fn(), create: jest.fn() },
    departamento: { findFirst: jest.fn(), findMany: jest.fn() },
    programaModalidad: { findMany: jest.fn() },
    tipoEvento: { findMany: jest.fn() },
    programaBaucher: { create: jest.fn() },
    role: { findFirst: jest.fn() },
    mod_campo_extra_respuesta: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const mockMailService = {
    sendInscripcionConfirmation: jest.fn().mockResolvedValue(true),
    sendVerificationCodeEmail: jest.fn().mockResolvedValue(true),
  };

  const mockUploadConfig = {
    validateImage: jest.fn(),
    getDynamicPath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingViewsController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: UploadConfigService, useValue: mockUploadConfig },
      ],
    }).compile();

    controller = module.get<LandingViewsController>(LandingViewsController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getLandingPageData', () => {
    it('debería retornar todos los bloques de la landing page correctamente', async () => {
      // Mockeamos todas las respuestas de Promise.all
      mockPrisma.profe.findFirst.mockResolvedValue({ nombre: 'Profe' });
      mockPrisma.evento.findMany.mockResolvedValue([]);
      mockPrisma.programaDos.findMany.mockResolvedValue([]);
      mockPrisma.comunicado.findMany.mockResolvedValue([]);
      mockPrisma.blog.findMany.mockResolvedValue([]);
      mockPrisma.galeria.findMany.mockResolvedValue([]);
      mockPrisma.sede.findMany.mockResolvedValue([]);
      mockPrisma.cargo.findMany.mockResolvedValue([]);

      const result = await controller.getLandingPageData();

      expect(result).toHaveProperty('profe');
      expect(result).toHaveProperty('eventos');
      expect(result).toHaveProperty('programas');
      expect(mockPrisma.profe.findFirst).toHaveBeenCalled();
    });
  });

  describe('getProgramaById', () => {
    it('debería lanzar BadRequestException si el programa no existe', async () => {
      mockPrisma.programaDos.findUnique.mockResolvedValue(null);
      await expect(controller.getProgramaById('invalid')).rejects.toThrow(BadRequestException);
    });

    it('debería retornar el detalle del programa y sus sedes hermanas', async () => {
      const mockProg = { id: 'p1', programaId: 'master1', versionId: 'v1' };
      mockPrisma.programaDos.findUnique.mockResolvedValue(mockProg);
      mockPrisma.programaDos.findMany.mockResolvedValue([mockProg]);

      const result = await controller.getProgramaById('p1');
      expect(result.id).toBe('p1');
      expect(result.sedesDisponibles).toBeDefined();
    });
  });

  describe('checkPersona', () => {
    it('debería retornar null si la persona no está en el padrón (mapPersona)', async () => {
      mockPrisma.mapPersona.findFirst.mockResolvedValue(null);
      const result = await controller.checkPersona('1234567');
      expect(result).toBeNull();
    });

    it('debería retornar datos simplificados si la persona existe', async () => {
      mockPrisma.mapPersona.findFirst.mockResolvedValue({
        id: 'per1',
        nombre1: 'JUAN',
        apellido1: 'PEREZ',
        genero: { nombre: 'MASCULINO' }
      });
      const result = await controller.checkPersona('1234567');
      expect(result!.nombre).toBe('JUAN');
    });
  });

  describe('registerInscripcion (Flujo Crítico)', () => {
    it('debería inscribir a un usuario existente en un programa', async () => {
      const body = { userId: 'u1', programaId: 'p1', sedeId: 's1' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', correo: 'test@test.com' });
      mockPrisma.programaDos.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue(null); // No inscrito aún
      mockPrisma.programa_inscripcion_estado.findFirst.mockResolvedValue({ id: 'est1' });
      mockPrisma.programaInscripcion.create.mockResolvedValue({ id: 'ins1' });

      const result = await controller.registerInscripcion(body);

      expect(result.success).toBe(true);
      expect(mockPrisma.programaInscripcion.create).toHaveBeenCalled();
    });
  });

  describe('checkPersonaByDate (Lógica Compleja)', () => {
    const validDate = '1990-01-01';

    it('debe lanzar BadRequestException si faltan datos', async () => {
      await expect(controller.checkPersonaByDate('123', ''))
        .rejects.toThrow(BadRequestException);
    });

    it('debe encontrar persona en map_persona y crear usuario si no existe', async () => {
      const mockPer = { id: 'p1', ci: '12345', nombre1: 'JAIME', apellido1: 'V', fechaNacimiento: new Date(validDate) };
      mockPrisma.mapPersona.findFirst.mockResolvedValue(mockPer);
      mockPrisma.user.findFirst.mockResolvedValue(null); // No tiene usuario
      mockPrisma.user.create.mockResolvedValue({ id: 'u-new', nombre: 'JAIME', correo: 'j@test.com' });

      const result = await controller.checkPersonaByDate('12345', validDate);

      expect(result.found).toBe(true);
      expect(result.source).toBe('map_persona');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('debe retornar found=false si la fecha de nacimiento no coincide', async () => {
      const mockPer = { id: 'p1', ci: '123', fechaNacimiento: new Date('1980-01-01') };
      mockPrisma.mapPersona.findFirst.mockResolvedValue(mockPer);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await controller.checkPersonaByDate('123', validDate);
      expect(result.found).toBe(false);
    });
  });

  describe('registerInscripcion (Casos Extendidos)', () => {
    it('debe crear un usuario nuevo si no se provee userId', async () => {
      const body = {
        programaId: 'prog-1',
        datosPersona: { nombre: 'LUIS', apellidos: 'PAZ', ci: '999', fechaNacimiento: '1995-05-05' }
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u-auto', nombre: 'LUIS' });
      mockPrisma.programaDos.findUnique.mockResolvedValue({ id: 'prog-1' });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue(null);
      mockPrisma.programa_inscripcion_estado.findFirst.mockResolvedValue({ id: 'e1' });
      mockPrisma.programaInscripcion.create.mockResolvedValue({ id: 'ins-new' });

      await controller.registerInscripcion(body);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('debe bloquear inscripción si ya está en otra sede de la MISMA versión', async () => {
      const body = { userId: 'u1', programaId: 'prog-hijo-2' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrisma.programaDos.findUnique.mockResolvedValue({ id: 'prog-hijo-2', programaId: 'master-x', versionId: 'v1' });
      mockPrisma.programaDos.findMany.mockResolvedValue([{ id: 'prog-hijo-1' }, { id: 'prog-hijo-2' }]);
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue({ id: 'ins-exist' });

      await expect(controller.registerInscripcion(body))
        .rejects.toThrow(BadRequestException);
    });

    it('debe registrar baucher si se adjunta en el body', async () => {
      const body = {
        userId: 'u1',
        programaId: 'p1',
        baucher: { imagen: 'b.jpg', nroDeposito: '123', monto: '100', fecha: '2025-01-01' }
      };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrisma.programaDos.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.programaInscripcion.findFirst.mockResolvedValue(null);
      mockPrisma.programa_inscripcion_estado.findFirst.mockResolvedValue({ id: 'e1' });
      mockPrisma.programaInscripcion.create.mockResolvedValue({ id: 'ins-1' });
      mockPrisma.programaBaucher.create.mockResolvedValue({});

      await controller.registerInscripcion(body);
      expect(mockPrisma.programaBaucher.create).toHaveBeenCalled();
    });
  });

  describe('Verificación de Correo y Password', () => {
    const email = 'test@profe.com';
    const code = '123456';

    it('sendVerificationCode: debe generar un código y guardarlo en el mapa interno', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockMailService.sendVerificationCodeEmail.mockResolvedValue(true);
      const result = await controller.sendVerificationCode({ correo: email, nombre: 'Test' });
      expect(result.success).toBe(true);
      expect(mockMailService.sendVerificationCodeEmail).toHaveBeenCalled();
    });

    it('verifyCode: debe fallar si el código es incorrecto', async () => {
      (controller as any).verificationCodes.set(email, { code: '000', expires: Date.now() + 10000 });
      await expect(controller.verifyCode({ correo: email, code: '999' }))
        .rejects.toThrow(BadRequestException);
    });

    it('resetPasswordWithCode: debe actualizar password si el código es válido', async () => {
      (controller as any).verificationCodes.set(email, { code: '111', expires: Date.now() + 10000 });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', correo: email, estado: 'activo' });
      mockPrisma.user.update = jest.fn().mockResolvedValue({});

      const result = await controller.resetPasswordWithCode({ correo: email, code: '111', password: 'new-password' });
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('Catálogos Públicos', () => {
    it('debe obtener departamentos', async () => {
      mockPrisma.departamento.findMany.mockResolvedValue([]);
      await controller.getDepartamentos();
      expect(mockPrisma.departamento.findMany).toHaveBeenCalled();
    });
  });
});
