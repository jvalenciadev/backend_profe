import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import {
  CreateEvaluacionUseCase,
  GetEvaluacionesUseCase,
  GetEvaluacionByIdUseCase,
  GetMyEvaluacionesUseCase,
  VerifyEvaluacionCodeUseCase,
  GetUsersToEvaluateUseCase,
} from './evaluacion.use-cases';
import { EVALUACION_REPOSITORY } from '../../domain/repositories/evaluacion.repository.interface';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fake-qr'),
}));

describe('Evaluacion Use Cases (Blindaje Completo)', () => {
  const mockRepo = {
    existsActiveForUserInPeriodo: jest.fn(),
    findPeriodoById: jest.fn(),
    findByVerificationCode: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    findUsersToEvaluate: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('https://test-url.com'),
  };

  const validUuid = '12345678-1234-1234-1234-123456789012';

  describe('CreateEvaluacionUseCase', () => {
    let useCase: CreateEvaluacionUseCase;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreateEvaluacionUseCase,
          { provide: EVALUACION_REPOSITORY, useValue: mockRepo },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();
      useCase = module.get<CreateEvaluacionUseCase>(CreateEvaluacionUseCase);
    });

    it('debe lanzar BadRequestException si el ID de usuario es inválido', async () => {
      await expect(useCase.execute({ userId: 'id-malo' }, 'tenant-1', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si ya existe una evaluación activa', async () => {
      mockRepo.existsActiveForUserInPeriodo.mockResolvedValue(true);
      await expect(useCase.execute({ userId: validUuid, periodoId: validUuid }, 'tenant-1', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ForbiddenException si el período es inactivo', async () => {
      mockRepo.existsActiveForUserInPeriodo.mockResolvedValue(false);
      mockRepo.findPeriodoById.mockResolvedValue({ id: validUuid, activo: false });
      await expect(useCase.execute({ userId: validUuid, periodoId: validUuid }, 'tenant-1', 'admin-1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si el puntaje excede el máximo del criterio', async () => {
      mockRepo.existsActiveForUserInPeriodo.mockResolvedValue(false);
      mockRepo.findPeriodoById.mockResolvedValue({
        id: validUuid,
        activo: true,
        criterios: [{ id: 'crit-1', nombre: 'C1', puntajeMaximo: 20 }]
      });
      await expect(useCase.execute({
        userId: validUuid,
        periodoId: validUuid,
        puntajes: [{ criterioId: 'crit-1', puntaje: 25 }]
      }, 'tenant-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('debe crear evaluación exitosamente con QR y código de verificación', async () => {
      mockRepo.existsActiveForUserInPeriodo.mockResolvedValue(false);
      mockRepo.findPeriodoById.mockResolvedValue({
        id: validUuid,
        activo: true,
        criterios: [{ id: 'crit-1', nombre: 'C1', puntajeMaximo: 20 }]
      });
      mockRepo.findByVerificationCode.mockResolvedValue(null);
      mockRepo.create.mockImplementation(data => ({ ...data, id: 'eval-1' }));

      const result = await useCase.execute({
        userId: validUuid,
        periodoId: validUuid,
        puntajes: [{ criterioId: 'crit-1', puntaje: 15 }]
      }, validUuid, 'admin-1');

      expect(result.id).toBe('eval-1');
      expect(result.qrCode).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('debe reintentar generar código si el primero ya existe', async () => {
      mockRepo.existsActiveForUserInPeriodo.mockResolvedValue(false);
      mockRepo.findPeriodoById.mockResolvedValue({ id: validUuid, activo: true, criterios: [] });
      mockRepo.findByVerificationCode
        .mockResolvedValueOnce({ id: 'eval-old' }) // el primero existe
        .mockResolvedValueOnce(null); // el segundo no
      mockRepo.create.mockResolvedValue({ id: 'eval-2' });

      await useCase.execute({ userId: validUuid, periodoId: validUuid }, validUuid, 'u1');
      expect(mockRepo.findByVerificationCode).toHaveBeenCalledTimes(2);
    });
  });

  describe('GetEvaluacionesUseCase', () => {
    let useCase: GetEvaluacionesUseCase;
    it('debe llamar al repositorio findAll', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetEvaluacionesUseCase,
          { provide: EVALUACION_REPOSITORY, useValue: mockRepo }
        ]
      }).compile();
      useCase = module.get(GetEvaluacionesUseCase);
      mockRepo.findAll.mockResolvedValue([]);
      await useCase.execute('t1', 'p1');
      expect(mockRepo.findAll).toHaveBeenCalledWith('t1', 'p1');
    });
  });

  describe('VerifyEvaluacionCodeUseCase', () => {
    let useCase: VerifyEvaluacionCodeUseCase;
    it('debe retornar valid=false si el código no existe', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VerifyEvaluacionCodeUseCase,
          { provide: EVALUACION_REPOSITORY, useValue: mockRepo }
        ]
      }).compile();
      useCase = module.get(VerifyEvaluacionCodeUseCase);
      mockRepo.findByVerificationCode.mockResolvedValue(null);
      const result = await useCase.execute('abc');
      expect(result.valid).toBe(false);
    });
    it('debe retornar valid=true si el código existe', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VerifyEvaluacionCodeUseCase,
          { provide: EVALUACION_REPOSITORY, useValue: mockRepo }
        ]
      }).compile();
      useCase = module.get(VerifyEvaluacionCodeUseCase);
      mockRepo.findByVerificationCode.mockResolvedValue({ id: 'eval-1' });
      const result = await useCase.execute('abc');
      expect(result.valid).toBe(true);
      expect(result.evaluation).toBeDefined();
    });
  });

  describe('GetEvaluacionByIdUseCase', () => {
    let useCase: GetEvaluacionByIdUseCase;
    it('debe lanzar NotFoundException si la evaluación no existe', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetEvaluacionByIdUseCase,
          { provide: EVALUACION_REPOSITORY, useValue: mockRepo }
        ]
      }).compile();
      useCase = module.get(GetEvaluacionByIdUseCase);
      mockRepo.findById.mockResolvedValue(null);
      await expect(useCase.execute('id-malo')).rejects.toThrow(NotFoundException);
    });
  });
});
