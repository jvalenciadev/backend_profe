import { Test, TestingModule } from '@nestjs/testing';
import { PrismaInscripcionRepository } from './prisma-inscripcion.repository';
import { PrismaService } from '@app/database';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

describe('PrismaInscripcionRepository (Unit Tests)', () => {
  let repository: PrismaInscripcionRepository;

  const mockPrisma = {
    programaInscripcion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    programaDosTurno: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      fields: {
        cupo: 'cupo', // Mocking Prisma fields helper
      },
    },
    programaBaucher: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaInscripcionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaInscripcionRepository>(
      PrismaInscripcionRepository,
    );
  });

  describe('findById', () => {
    it('debe retornar una entidad Inscripcion si el registro existe', async () => {
      const mockData = { id: 'ins-1', personaId: 'p1', programaId: 'prog-1' };
      mockPrisma.programaInscripcion.findUnique.mockResolvedValue(mockData);

      const result = await repository.findById('ins-1');
      expect(result!.id).toBe('ins-1');
      expect(mockPrisma.programaInscripcion.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ins-1' } }),
      );
    });

    it('debe retornar null si no existe el registro', async () => {
      mockPrisma.programaInscripcion.findUnique.mockResolvedValue(null);
      const result = await repository.findById('none');
      expect(result).toBeNull();
    });
  });

  describe('reserveCupo', () => {
    it('debe retornar true si findMany atómico afectó una fila', async () => {
      mockPrisma.programaDosTurno.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.reserveCupo('prog-1', 'turno-1');

      expect(result).toBe(true);
      expect(mockPrisma.programaDosTurno.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'turno-1',
            programaDosId: 'prog-1',
          }),
        }),
      );
    });

    it('debe retornar false si no se incrementó ningún cupo (sin cupos o turno inválido)', async () => {
      mockPrisma.programaDosTurno.updateMany.mockResolvedValue({ count: 0 });
      const result = await repository.reserveCupo('prog-1', 'turno-1');
      expect(result).toBe(false);
    });

    it('debe atrapar errores y retornar false', async () => {
      mockPrisma.programaDosTurno.updateMany.mockRejectedValue(
        new Error('DB error'),
      );
      const result = await repository.reserveCupo('prog-1', 'turno-1');
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('debe mappear los datos correctamente al crear', async () => {
      const dto = { personaId: 'p1', programaId: 'prog-1', sedeId: 's1' };
      mockPrisma.programaInscripcion.create.mockResolvedValue({
        id: 'ins-1',
        ...dto,
      });

      const result = await repository.create(dto);

      expect(result).toBeInstanceOf(Inscripcion);
      expect(mockPrisma.programaInscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            personaId: 'p1',
            programaId: 'prog-1',
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('debe realizar un soft-delete marcando como eliminado', async () => {
      await repository.delete('ins-1');
      expect(mockPrisma.programaInscripcion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ins-1' },
          data: { estado: 'eliminado' },
        }),
      );
    });
  });
});
