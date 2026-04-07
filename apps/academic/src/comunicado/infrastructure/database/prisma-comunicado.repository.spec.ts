import { Test, TestingModule } from '@nestjs/testing';
import { PrismaComunicadoRepository } from './prisma-comunicado.repository';
import { PrismaService } from '@app/database';
import { CaslPrismaService } from '@app/common';

describe('PrismaComunicadoRepository (Unit Tests)', () => {
  let repository: PrismaComunicadoRepository;

  const mockPrisma = {
    comunicado: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCasl = {
    getWhere: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaComunicadoRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CaslPrismaService, useValue: mockCasl },
      ],
    }).compile();

    repository = module.get<PrismaComunicadoRepository>(PrismaComunicadoRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('debe retornar un comunicado si existe', async () => {
      mockPrisma.comunicado.findFirst.mockResolvedValue({ id: 'c1', nombre: 'Test' });
      const result = await repository.findById('c1');
      expect(result!.id).toBe('c1');
    });

    it('debe retornar null si no existe', async () => {
      mockPrisma.comunicado.findFirst.mockResolvedValue(null);
      const result = await repository.findById('none');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('debe llamar a comunicado.create con los datos correctos', async () => {
      const dto = { nombre: 'N', descripcion: 'D', tipo: 'T' } as any;
      mockPrisma.comunicado.create.mockResolvedValue({ id: 'new', ...dto });
      await repository.create(dto);
      expect(mockPrisma.comunicado.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nombre: 'N' })
        })
      );
    });
  });

  describe('delete', () => {
    it('debe realizar un soft delete marcando como inactivo', async () => {
      await repository.delete('c1');
      expect(mockPrisma.comunicado.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: expect.objectContaining({ estado: 'eliminado' })
        })
      );
    });
  });
});
