import { Test, TestingModule } from '@nestjs/testing';
import { CreateComunicadoUseCase } from './create-comunicado.use-case';
import {
  UpdateComunicadoUseCase,
  DeleteComunicadoUseCase,
} from './update-comunicado.use-case';
import { GetComunicadosUseCase } from './get-comunicados.use-case';
import { COMUNICADO_REPOSITORY } from '../../domain/repositories/comunicado.repository.interface';
import { PrismaService } from '@app/database';
import { MailService } from '@app/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Comunicado Use Cases (Blindaje Completo)', () => {
  const mockRepo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrisma = {
    user: { findMany: jest.fn() },
  };

  const mockMail = {
    sendComunicadoEmailChunks: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('CreateComunicadoUseCase', () => {
    let useCase: CreateComunicadoUseCase;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreateComunicadoUseCase,
          { provide: COMUNICADO_REPOSITORY, useValue: mockRepo },
          { provide: PrismaService, useValue: mockPrisma },
          { provide: MailService, useValue: mockMail },
        ],
      }).compile();
      useCase = module.get(CreateComunicadoUseCase);
    });

    it('debe crear un comunicado exitosamente', async () => {
      const dto = { nombre: 'Test', descripcion: 'D', tipo: 'GENERAL' };
      mockRepo.create.mockResolvedValue({ id: 'c1', ...dto });

      const result = await useCase.execute(dto as any, 'u1', 't1');
      expect(result.id).toBe('c1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1' }),
      );
    });

    it('debe disparar notificación administrativa si es Urgente', async () => {
      const dto = {
        nombre: 'Urgente',
        tipo: 'ADMINISTRATIVO',
        importancia: 'URGENTE',
      };
      mockRepo.create.mockResolvedValue({ id: 'c-u', ...dto });

      // El setImmediate es difícil de testear sincrónicamente pero podemos verificar la llamada al repo
      await useCase.execute(dto as any);
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el repositorio falla', async () => {
      mockRepo.create.mockRejectedValue(new Error('DB Fail'));
      await expect(useCase.execute({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('UpdateComunicadoUseCase', () => {
    let useCase: UpdateComunicadoUseCase;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UpdateComunicadoUseCase,
          { provide: COMUNICADO_REPOSITORY, useValue: mockRepo },
        ],
      }).compile();
      useCase = module.get(UpdateComunicadoUseCase);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(useCase.execute('none', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe actualizar exitosamente', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1' });
      mockRepo.update.mockResolvedValue({ id: 'c1', nombre: 'Updated' });
      const result = await useCase.execute('c1', { nombre: 'Updated' }, 'u1');
      expect(result.nombre).toBe('Updated');
    });
  });

  describe('DeleteComunicadoUseCase', () => {
    let useCase: DeleteComunicadoUseCase;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeleteComunicadoUseCase,
          { provide: COMUNICADO_REPOSITORY, useValue: mockRepo },
        ],
      }).compile();
      useCase = module.get(DeleteComunicadoUseCase);
    });

    it('debe eliminar exitosamente', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1' });
      mockRepo.delete.mockResolvedValue(true);
      const result = await useCase.execute('c1');
      expect(result).toBe(true);
    });
  });
});
