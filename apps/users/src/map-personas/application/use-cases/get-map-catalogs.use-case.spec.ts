import { Test, TestingModule } from '@nestjs/testing';
import { GetMapCatalogsUseCase } from './get-map-catalogs.use-case';
import { PrismaService } from '@app/database';

describe('GetMapCatalogsUseCase (Blindaje Completo)', () => {
  let useCase: GetMapCatalogsUseCase;

  const mockPrisma = {
    mapCargo: { findMany: jest.fn() },
    mapCategoria: { findMany: jest.fn() },
    mapNivel: { findMany: jest.fn() },
    mapSubsistema: { findMany: jest.fn() },
    mapEspecialidad: { findMany: jest.fn() },
    mapGenero: { findMany: jest.fn() },
    mapArea: { findMany: jest.fn() },
    mapPersona: { count: jest.fn(), groupBy: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMapCatalogsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<GetMapCatalogsUseCase>(GetMapCatalogsUseCase);
  });

  it('debe obtener cargos activos ordenados', async () => {
    await useCase.getCargos();
    expect(mockPrisma.mapCargo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'activo' }, orderBy: { nombre: 'asc' } })
    );
  });

  it('debe obtener categorías activas ordenadas', async () => {
    await useCase.getCategorias();
    expect(mockPrisma.mapCategoria.findMany).toHaveBeenCalled();
  });

  it('debe obtener niveles activos ordenados', async () => {
    await useCase.getNiveles();
    expect(mockPrisma.mapNivel.findMany).toHaveBeenCalled();
  });

  it('debe obtener estadísticas completas (getStats)', async () => {
    mockPrisma.mapPersona.count.mockResolvedValue(100);
    mockPrisma.mapPersona.groupBy.mockResolvedValue([]);
    mockPrisma.mapCargo.findMany.mockResolvedValue([]);
    mockPrisma.mapEspecialidad.findMany.mockResolvedValue([]);
    mockPrisma.mapCategoria.findMany.mockResolvedValue([]);
    mockPrisma.mapGenero.findMany.mockResolvedValue([]);
    mockPrisma.mapArea.findMany.mockResolvedValue([]);
    mockPrisma.mapSubsistema.findMany.mockResolvedValue([]);
    mockPrisma.mapNivel.findMany.mockResolvedValue([]);

    const result = await useCase.getStats();

    expect(result).toHaveProperty('total', 100);
    expect(result).toHaveProperty('kpis');
    expect(result.kpis).toHaveProperty('digitalizacion');
    expect(mockPrisma.mapPersona.count).toHaveBeenCalled();
    expect(mockPrisma.mapPersona.groupBy).toHaveBeenCalledTimes(7);
  });

  it('debe hidratar nombres en las estadísticas correctamente', async () => {
    mockPrisma.mapPersona.count.mockResolvedValue(10);
    mockPrisma.mapPersona.groupBy.mockResolvedValue([
      { carId: 'c1', _count: { _all: 5 } }
    ]);
    mockPrisma.mapCargo.findMany.mockResolvedValue([
      { id: 'c1', nombre: 'DIRECTOR' }
    ]);
    mockPrisma.mapEspecialidad.findMany.mockResolvedValue([]);
    mockPrisma.mapCategoria.findMany.mockResolvedValue([]);
    mockPrisma.mapGenero.findMany.mockResolvedValue([]);
    mockPrisma.mapArea.findMany.mockResolvedValue([]);
    mockPrisma.mapSubsistema.findMany.mockResolvedValue([]);
    mockPrisma.mapNivel.findMany.mockResolvedValue([]);

    const result = await useCase.getStats();
    expect(result.cargos[0].name).toBe('DIRECTOR');
    expect(result.cargos[0].value).toBe(5);
  });

  it('debe manejar IDs nulos en las estadísticas (SIN CARGO, etc)', async () => {
    mockPrisma.mapPersona.count.mockResolvedValue(10);
    mockPrisma.mapPersona.groupBy.mockResolvedValue([
      { carId: null, _count: { _all: 2 } }
    ]);
    mockPrisma.mapCargo.findMany.mockResolvedValue([]);
    mockPrisma.mapEspecialidad.findMany.mockResolvedValue([]);
    mockPrisma.mapCategoria.findMany.mockResolvedValue([]);
    mockPrisma.mapGenero.findMany.mockResolvedValue([]);
    mockPrisma.mapArea.findMany.mockResolvedValue([]);
    mockPrisma.mapSubsistema.findMany.mockResolvedValue([]);
    mockPrisma.mapNivel.findMany.mockResolvedValue([]);

    const result = await useCase.getStats();
    expect(result.cargos[0].name).toBe('SIN CARGO');
  });
});
