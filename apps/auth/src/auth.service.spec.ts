import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import { CaslAbilityFactory, MailService } from '@app/common';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123'),
  compare: jest.fn(),
}));

describe('AuthService (Blindaje Completo)', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    username: 'superadmin',
    correo: 'admin@profe.com',
    password: 'hashed_pass',
    nombre: 'Juan',
    apellidos: 'Pérez',
    estado: 'activo',
    requiresPasswordChange: false,
    resetPasswordExpires: null,
    roles: [{ role: { name: 'ADMIN', rolePermissions: [] } }],
    sedes: [],
    tenant: null,
    tenantId: null,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    token_dispositivo: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: { findFirst: jest.fn(), create: jest.fn() },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  const mockAbilityFactory = {
    createForUser: jest.fn().mockResolvedValue({ rules: [] }),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CaslAbilityFactory, useValue: mockAbilityFactory },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── forgotPassword ────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('debería retornar mensaje genérico si el email NO existe (seguridad)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword('noexiste@test.com');
      expect(res.message).toContain('Si el correo');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('debería generar token y enviar email si el usuario existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const res = await service.forgotPassword('admin@profe.com');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        }),
      });
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(res.message).toContain('Si el correo');
    });
  });

  // ─── resetPassword ─────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('debería lanzar UnauthorizedException si el token es inválido o expirado', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('token_invalido', 'nuevaPass123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debería actualizar la contraseña si el token es válido', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const res = await service.resetPassword('token_valido', 'nuevaPass123');

      expect(bcrypt.hash).toHaveBeenCalledWith('nuevaPass123', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          password: 'hashed_password_123',
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }),
      });
      expect(res.message).toContain('exitosamente');
    });
  });

  // ─── validateUser ──────────────────────────────────────────────────
  describe('validateUser', () => {
    it('debería retornar null si el usuario no existe', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const result = await service.validateUser('noexiste', 'pass');
      expect(result).toBeNull();
    });

    it('debería retornar null si la contraseña es incorrecta', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser('superadmin', 'pass_incorrecta');
      expect(result).toBeNull();
    });

    it('debería lanzar error si el usuario está inactivo/bloqueado', async () => {
      const inactiveUser = { ...mockUser, estado: 'bloqueado' };
      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser('superadmin', 'juanpa123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar error si es solo PARTICIPANTE intentando acceder al admin', async () => {
      const participante = {
        ...mockUser,
        roles: [{ role: { name: 'PARTICIPANTE', rolePermissions: [] } }],
      };
      mockPrisma.user.findFirst.mockResolvedValue(participante);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser('participante', 'pass'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar error si la contraseña temporal ha expirado', async () => {
      const expiredUser = {
        ...mockUser,
        requiresPasswordChange: true,
        resetPasswordExpires: new Date('2020-01-01'),
      };
      mockPrisma.user.findFirst.mockResolvedValue(expiredUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser('superadmin', 'juanpa123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debería retornar usuario sin contraseña si todo es válido', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser('superadmin', 'juanpa123');
      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
      expect(result.username).toBe('superadmin');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────
  describe('login', () => {
    it('debería retornar access_token y datos del usuario', async () => {
      const result = await service.login(mockUser);
      expect(result.access_token).toBe('mock_jwt_token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.roles).toContain('ADMIN');
    });

    it('debería registrar el token de dispositivo si se proporciona uno nuevo', async () => {
      mockPrisma.token_dispositivo.findFirst.mockResolvedValue(null);
      mockPrisma.token_dispositivo.create.mockResolvedValue({});

      await service.login(mockUser, 'device_token_abc');
      expect(mockPrisma.token_dispositivo.create).toHaveBeenCalled();
    });

    it('debería actualizar el token de dispositivo si ya existe y pertenece a otro user', async () => {
      mockPrisma.token_dispositivo.findFirst.mockResolvedValue({
        id_token: 't1',
        userId: 'otro_user',
        token: 'device_token_abc',
      });
      mockPrisma.token_dispositivo.update.mockResolvedValue({});

      await service.login(mockUser, 'device_token_abc');
      expect(mockPrisma.token_dispositivo.update).toHaveBeenCalled();
    });
  });

  // ─── getProfile ────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user_desconocido'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debería retornar el perfil completo del usuario', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile('user-1');
      expect(result.id).toBe('user-1');
      expect(result.roles).toEqual(['ADMIN']);
    });
  });

  // ─── validate ──────────────────────────────────────────────────────
  describe('validate', () => {
    it('debería retornar el payload del JWT transformado en objeto usuario', async () => {
      const payload = { sub: 'user-1', username: 'superadmin', roles: ['ADMIN'], sedes: [], tenantId: null };
      const result = await service.validate(payload);
      expect(result.id).toBe('user-1');
      expect(result.username).toBe('superadmin');
    });
  });
});
