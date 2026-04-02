import { Test, TestingModule } from '@nestjs/testing';
import { LmsService } from './lms.service';
import { PrismaService } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import { NotificacionesService } from './notificaciones/notificaciones.service';
import { MailService } from '@app/common';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('LmsService (Pruebas Unitarias)', () => {
  let service: LmsService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
    token_dispositivo: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    programaInscripcion: {
      findMany: jest.fn(),
    },
    profe: {
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockNotiService = {};
  const mockMailService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LmsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: NotificacionesService, useValue: mockNotiService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<LmsService>(LmsService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('debería lanzar UnauthorizedException si no se encuentra al usuario', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.login('usuario-no-existe', 'contraseña')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar UnauthorizedException si la contraseña no coincide', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        password: 'password-hasheada',
        roles: [],
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login('testuser', 'clave-incorrecta')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería devolver una respuesta exitosa si las credenciales son válidas y tiene acceso', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'juan.perez',
        password: 'password-hasheada',
        nombre: 'Juan',
        apellidos: 'Perez',
        correo: 'juan@example.com',
        roles: [{ role: { name: 'ADMIN' } }], // Rol con acceso permitido
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.profe.findFirst.mockResolvedValue({
        color: '#ffffff',
        nombre: 'Profe',
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const response = await service.login('juan.perez', 'password');

      expect(response).toHaveProperty('access_token');
      expect(response.user.username).toBe('juan.perez');
      expect(response.user.roles).toContain('ADMIN');
    });
  });
});
