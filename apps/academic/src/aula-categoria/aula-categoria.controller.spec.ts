import { Test, TestingModule } from '@nestjs/testing';
import { AulaCategoriaController } from './aula-categoria.controller';
import { AulaCategoriaService } from './aula-categoria.service';

describe('AulaCategoriaController (Blindaje Completo)', () => {
  let controller: AulaCategoriaController;

  const mockService = {
    getConfigByTipos: jest.fn(),
    getConfigByTipoId: jest.fn(),
    createConfig: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    aplicarConfigAModulo: jest.fn(),
    getMateriaAsignada: jest.fn(),
    getAllModulos: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AulaCategoriaController],
      providers: [{ provide: AulaCategoriaService, useValue: mockService }],
    })
      .overrideGuard(require('@app/common').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('@app/common').PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AulaCategoriaController>(AulaCategoriaController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('Configuración Global', () => {
    it('debe obtener todos los tipos con config', async () => {
      mockService.getConfigByTipos.mockResolvedValue([]);
      await controller.getConfigByTipos();
      expect(mockService.getConfigByTipos).toHaveBeenCalled();
    });

    it('debe obtener config por ID de tipo', async () => {
      mockService.getConfigByTipoId.mockResolvedValue([]);
      await controller.getConfigByTipoId('t1');
      expect(mockService.getConfigByTipoId).toHaveBeenCalledWith('t1');
    });

    it('debe crear config de tipo', async () => {
      const data = { nombre: 'Test', peso: 10 };
      mockService.createConfig.mockResolvedValue({ id: 'c1' });
      await controller.createConfig('t1', data);
      expect(mockService.createConfig).toHaveBeenCalledWith('t1', data);
    });
  });

  describe('Instancias por Módulo', () => {
    it('debe obtener todas las categorías de un módulo', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll('m1');
      expect(mockService.findAll).toHaveBeenCalledWith('m1');
    });

    it('debe crear una categoría para el módulo', async () => {
      const data = { nombre: 'N', ponderacion: 20 };
      mockService.create.mockResolvedValue({ id: 'cat-1' });
      await controller.create('m1', data);
      expect(mockService.create).toHaveBeenCalledWith('m1', data);
    });

    it('debe actualizar una categoría', async () => {
      const data = { nombre: 'N2' };
      mockService.update.mockResolvedValue([]);
      await controller.update('cat-1', data);
      expect(mockService.update).toHaveBeenCalledWith('cat-1', data);
    });

    it('debe eliminar (remove) una categoría', async () => {
      mockService.remove.mockResolvedValue({ status: 'ok' });
      await controller.remove('cat-1');
      expect(mockService.remove).toHaveBeenCalledWith('cat-1');
    });

    it('debe aplicar config de tipo a un módulo', async () => {
      mockService.aplicarConfigAModulo.mockResolvedValue({ count: 5 });
      await controller.aplicarConfig('m1', { tipoProgramaId: 't1' });
      expect(mockService.aplicarConfigAModulo).toHaveBeenCalledWith('m1', 't1');
    });
  });
});
