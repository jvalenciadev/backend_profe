import { Test, TestingModule } from '@nestjs/testing';
import { CreateInscripcionUseCase } from './create-inscripcion.use-case';
import { UpdateInscripcionUseCase } from './update-inscripcion.use-case';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import { OFERTA_REPOSITORY } from '../../../oferta/domain/repositories/oferta.repository.interface';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

describe('Inscripcion Use Cases (Blindaje Completo)', () => {
  let createUseCase: CreateInscripcionUseCase;
  let updateUseCase: UpdateInscripcionUseCase;

  const mockInscripcionRepo = {
    findByPersonaAndPrograma: jest.fn(),
    reserveCupo: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockOfertaRepo = {
    findById: jest.fn(),
  };

  const mockOferta = {
    id: 'prog-1',
    sedeId: 'sede-1',
    estadoInscripcion: true,
    fechaInicioInscripcion: new Date('2025-01-01'),
    fechaFinInscripcion: new Date('2099-12-31'),
    isEnrollmentOpen: jest.fn().mockReturnValue(true),
  };

  const dto = {
    programaId: 'prog-1',
    personaId: 'persona-1',
    turnoId: 'turno-1',
    sedeId: 'sede-1',
    estadoInscripcionId: 'estado-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInscripcionUseCase,
        UpdateInscripcionUseCase,
        { provide: INSCRIPCION_REPOSITORY, useValue: mockInscripcionRepo },
        { provide: OFERTA_REPOSITORY, useValue: mockOfertaRepo },
      ],
    }).compile();

    createUseCase = module.get<CreateInscripcionUseCase>(
      CreateInscripcionUseCase,
    );
    updateUseCase = module.get<UpdateInscripcionUseCase>(
      UpdateInscripcionUseCase,
    );
  });

  describe('CreateInscripcionUseCase', () => {
    it('debe lanzar NotFoundException si la oferta no existe', async () => {
      mockOfertaRepo.findById.mockResolvedValue(null);
      await expect(createUseCase.execute(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si el período de inscripción está cerrado', async () => {
      mockOfertaRepo.findById.mockResolvedValue({
        ...mockOferta,
        isEnrollmentOpen: jest.fn().mockReturnValue(false),
      });
      await expect(createUseCase.execute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si la persona ya está inscrita', async () => {
      mockOfertaRepo.findById.mockResolvedValue(mockOferta);
      mockInscripcionRepo.findByPersonaAndPrograma.mockResolvedValue({
        id: 'existing-ins',
      });
      await expect(createUseCase.execute(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar BadRequestException si no hay cupos disponibles', async () => {
      mockOfertaRepo.findById.mockResolvedValue(mockOferta);
      mockInscripcionRepo.findByPersonaAndPrograma.mockResolvedValue(null);
      mockInscripcionRepo.reserveCupo.mockResolvedValue(false);
      await expect(createUseCase.execute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe crear la inscripción exitosamente con sedeId de la oferta', async () => {
      mockOfertaRepo.findById.mockResolvedValue(mockOferta);
      mockInscripcionRepo.findByPersonaAndPrograma.mockResolvedValue(null);
      mockInscripcionRepo.reserveCupo.mockResolvedValue(true);
      const mockInscripcion = { id: 'ins-new', ...dto, sedeId: 'sede-1' };
      mockInscripcionRepo.create.mockResolvedValue(mockInscripcion);

      const result = await createUseCase.execute(dto, 'admin-1');

      expect(result.id).toBe('ins-new');
      expect(mockInscripcionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sedeId: 'sede-1',
          createdBy: 'admin-1',
        }),
      );
    });
  });

  describe('UpdateInscripcionUseCase', () => {
    it('debe lanzar NotFoundException si la inscripción no existe', async () => {
      mockInscripcionRepo.findById.mockResolvedValue(null);
      await expect(updateUseCase.execute('ins-x', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe actualizar datos sin cambiar programa', async () => {
      const existing = { id: 'ins-1', programaId: 'prog-1', sedeId: 'sede-1' };
      mockInscripcionRepo.findById.mockResolvedValue(existing);
      mockInscripcionRepo.update.mockResolvedValue({
        ...existing,
        estado: 'confirmado',
      });

      const result = await updateUseCase.execute(
        'ins-1',
        { estado: 'confirmado' },
        'admin-1',
      );
      expect(result.id).toBe('ins-1');
      expect(mockInscripcionRepo.update).toHaveBeenCalledWith(
        'ins-1',
        expect.objectContaining({ estado: 'confirmado', updatedBy: 'admin-1' }),
      );
    });

    it('debe lanzar NotFoundException si el nuevo programa no existe al cambiar', async () => {
      const existing = { id: 'ins-1', programaId: 'prog-1' };
      mockInscripcionRepo.findById.mockResolvedValue(existing);
      mockOfertaRepo.findById.mockResolvedValue(null);

      await expect(
        updateUseCase.execute('ins-1', { programaId: 'prog-nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe actualizar sedeId desde la nueva oferta al cambiar programa', async () => {
      const existing = { id: 'ins-1', programaId: 'prog-1' };
      mockInscripcionRepo.findById.mockResolvedValue(existing);
      mockOfertaRepo.findById.mockResolvedValue({
        id: 'prog-2',
        sedeId: 'sede-nueva',
      });
      mockInscripcionRepo.update.mockResolvedValue({
        id: 'ins-1',
        sedeId: 'sede-nueva',
      });

      await updateUseCase.execute('ins-1', { programaId: 'prog-2' }, 'admin-1');
      expect(mockInscripcionRepo.update).toHaveBeenCalledWith(
        'ins-1',
        expect.objectContaining({ sedeId: 'sede-nueva' }),
      );
    });
  });
});
