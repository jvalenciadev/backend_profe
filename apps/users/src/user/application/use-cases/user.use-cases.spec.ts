import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserUseCase, UpdateUserUseCase, ResetUserPasswordUseCase, ChangePasswordUseCase } from './user.use-cases';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { MailService } from '@app/common';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn(),
}));

describe('UserUseCases (Unit Tests)', () => {
  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByEmail: jest.fn(),
    getRawToken: jest.fn(),
  };

  const mockMail = {
    sendWelcomeEmail: jest.fn().mockResolvedValue({}),
    sendPasswordResetSuccess: jest.fn().mockResolvedValue({}),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  };

  let createUserUseCase: CreateUserUseCase;
  let updateUserUseCase: UpdateUserUseCase;
  let resetPasswordUseCase: ResetUserPasswordUseCase;
  let changePasswordUseCase: ChangePasswordUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        UpdateUserUseCase,
        ResetUserPasswordUseCase,
        ChangePasswordUseCase,
        { provide: USER_REPOSITORY, useValue: mockRepository },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    createUserUseCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    updateUserUseCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
    resetPasswordUseCase = module.get<ResetUserPasswordUseCase>(ResetUserPasswordUseCase);
    changePasswordUseCase = module.get<ChangePasswordUseCase>(ChangePasswordUseCase);
  });

  describe('CreateUserUseCase', () => {
    it('debería crear un usuario hash de contraseña y enviar correo de bienvenida', async () => {
      const data = { nombre: 'Juan', username: 'j1', email: 'j@j.com', roles: [], sedes: [] };
      mockRepository.create.mockResolvedValue({ id: 'u1', ...data });

      const result = await createUserUseCase.execute(data, { id: 'admin' });

      expect(result.id).toBe('u1');
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ correo: 'j@j.com' }));
      expect(mockMail.sendWelcomeEmail).toHaveBeenCalled();
    });
  });

  describe('UpdateUserUseCase', () => {
    it('debería lanzar ForbiddenException si intenta cambiar email sin código de verificación', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'u1', correo: 'old@mail.com' });
      mockRepository.getRawToken.mockResolvedValue('123456');

      const data = { email: 'new@mail.com', verificationCode: 'wrong' };
      await expect(updateUserUseCase.execute('u1', data, { id: 'admin' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('debería actualizar el usuario si el código de verificación es correcto para cambio de email', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'u1', correo: 'old@mail.com' });
      mockRepository.getRawToken.mockResolvedValue('123456');
      mockRepository.update.mockResolvedValue({ id: 'u1', correo: 'new@mail.com' });

      const data = { email: 'new@mail.com', verificationCode: '123456' };
      const result = await updateUserUseCase.execute('u1', data, { id: 'admin' });

      expect(result.correo).toBe('new@mail.com');
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('ChangePasswordUseCase', () => {
    it('debería lanzarForbiddenException si la contraseña actual es incorrecta', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'u1', password: 'hashed_old' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(changePasswordUseCase.execute('u1', 'wrong', 'new123'))
        .rejects.toThrow(ForbiddenException);
    });

    it('debería actualizar la contraseña si la actual es correcta', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'u1', password: 'hashed_old' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepository.update.mockResolvedValue({});

      await changePasswordUseCase.execute('u1', 'old123', 'new123456');

      expect(bcrypt.hash).toHaveBeenCalledWith('new123456', 12);
      expect(mockRepository.update).toHaveBeenCalledWith('u1', expect.objectContaining({ requiresPasswordChange: false }));
    });
  });
});
