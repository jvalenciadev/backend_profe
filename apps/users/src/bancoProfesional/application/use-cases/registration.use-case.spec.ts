import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationUseCase } from './registration.use-case';
import { BANCO_PROFESIONAL_REPOSITORY } from '../../domain/repositories/banco-profesional.repository.interface';
import { RequestVerificationUseCase } from './request-verification.use-case';
import { PrismaService } from '@app/database';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock de bcrypt a nivel de módulo para evitar conflictos
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn(),
}));

describe('RegistrationUseCase (Fase 4: Alta de Usuarios - Final)', () => {
  let useCase: RegistrationUseCase;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: { findFirst: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
  };

  const mockVerification = {
    verifyCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationUseCase,
        { provide: BANCO_PROFESIONAL_REPOSITORY, useValue: {} },
        { provide: RequestVerificationUseCase, useValue: mockVerification },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<RegistrationUseCase>(RegistrationUseCase);
  });

  it('debería registrar un usuario si todos los datos son válidos', async () => {
    mockVerification.verifyCode.mockReturnValue(true);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.role.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1',
      username: '123',
      correo: 't@t.com',
    });

    const res = await useCase.execute({
      correo: 't@t.com',
      verificationCode: '1',
      ci: '123',
      nombre: 'n',
      apellidos: 'a',
      password: 'p',
    });

    expect(res.id).toBe('u1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('debería fallar si el CI ya existe', async () => {
    mockVerification.verifyCode.mockReturnValue(true);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u2', ci: BigInt(123), estado: 'activo' },
    ]);

    await expect(
      useCase.execute({ ci: '123', correo: 't@t.com', verificationCode: '1' }),
    ).rejects.toThrow(ConflictException);
  });
});
