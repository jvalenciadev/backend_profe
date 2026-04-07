import { Test, TestingModule } from '@nestjs/testing';
import { CreateAcademicVersionUseCase } from './create-academic-version.use-case';
import { PrismaService } from '@app/database';
import { NotFoundException } from '@nestjs/common';

describe('CreateAcademicVersionUseCase (Fase 1: Academia)', () => {
  let useCase: CreateAcademicVersionUseCase;
  let prisma: PrismaService;

  const mockPrismaService = {
    programa: {
      findUnique: jest.fn(),
    },
    programaDos: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAcademicVersionUseCase,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    useCase = module.get<CreateAcademicVersionUseCase>(CreateAcademicVersionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('debería lanzar NotFoundException si el programa maestro no existe', async () => {
    mockPrismaService.programa.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('invalid_id', {}, { id: 'user_1' })
    ).rejects.toThrow(NotFoundException);
  });

  it('debería crear una versión operativa con snapshot de módulos y turnos', async () => {
    const mockMaster = {
      id: 'master_1',
      nombre: 'Diplomado en IA',
      codigo: 'DIA-01',
      modulos: [
        { id: 'm1', nombre: 'Módulo 1', esGlobal: false, orden: 1 },
        { id: 'm2', nombre: 'Módulo Global', esGlobal: true, orden: 2 },
      ],
    };

    const versionData = {
      nombre: 'DIA - Versión 2024',
      fechaIniClase: '2024-05-01',
      turnos: [{ turnoId: 't1', cupo: 30 }],
    };

    mockPrismaService.programa.findUnique.mockResolvedValue(mockMaster);
    mockPrismaService.programaDos.create.mockResolvedValue({ id: 'v1', ...versionData });

    const result = await useCase.execute('master_1', versionData, { id: 'admin' });

    expect(result).toBeDefined();
    expect(mockPrismaService.programaDos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: 'DIA - Versión 2024',
        programaId: 'master_1',
        modulos: expect.objectContaining({
          create: expect.arrayContaining([
            expect.objectContaining({ nombre: 'Módulo 1' })
          ])
        }),
      }),
      include: { modulos: true, turnos: true },
    });
    
    // Verificamos que los módulos globales NO se copien a la versión operativa
    const callData = mockPrismaService.programaDos.create.mock.calls[0][0].data;
    expect(callData.modulos.create).toHaveLength(1);
  });
});
