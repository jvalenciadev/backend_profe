import { Test, TestingModule } from '@nestjs/testing';
import { AulaCategoriaService } from './aula-categoria.service';
import { PrismaService } from '@app/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AulaCategoriaService (Blindaje Completo - 459 líneas)', () => {
  let service: AulaCategoriaService;

  const mockPrisma = {
    programaTipo: { findMany: jest.fn(), findUnique: jest.fn() },
    mod_tipo_calificacion_config: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mod_categoria_calificacion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    programaModuloDos: { findUnique: jest.fn(), findMany: jest.fn() },
    programaModulo: { findUnique: jest.fn() },
    programaDosFacilitador: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AulaCategoriaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AulaCategoriaService>(AulaCategoriaService);
  });

  // ─── getConfigByTipos ─────────────────────────────────────────────
  describe('getConfigByTipos', () => {
    it('debe retornar tipos de programa con sus categorías', async () => {
      mockPrisma.programaTipo.findMany.mockResolvedValue([{ id: 't1', nombre: 'Diplomado', mod_tipos_calificacion: [] }]);
      const result = await service.getConfigByTipos();
      expect(result).toHaveLength(1);
    });
  });

  // ─── getConfigByTipoId ────────────────────────────────────────────
  describe('getConfigByTipoId', () => {
    it('debe retornar configs del tipo especificado', async () => {
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ id: 'c1', nombre: 'Examen', peso: 60 }]);
      const result = await service.getConfigByTipoId('tipo-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── createConfig ─────────────────────────────────────────────────
  describe('createConfig', () => {
    it('debe lanzar NotFoundException si el tipo no existe', async () => {
      mockPrisma.programaTipo.findUnique.mockResolvedValue(null);
      await expect(service.createConfig('tipo-999', { nombre: 'Test', peso: 30 }))
        .rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el peso excede el máximo', async () => {
      mockPrisma.programaTipo.findUnique.mockResolvedValue({ id: 't1', notaMaxima: 100 });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([
        { peso: 80 },
      ]);
      await expect(service.createConfig('tipo-1', { nombre: 'Extras', peso: 30 }))
        .rejects.toThrow(BadRequestException);
    });

    it('debe crear la config si el peso es válido', async () => {
      mockPrisma.programaTipo.findUnique.mockResolvedValue({ id: 't1', notaMaxima: 100 });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ peso: 60 }]);
      mockPrisma.mod_tipo_calificacion_config.create.mockResolvedValue({ id: 'config-new' });
      const result = await service.createConfig('tipo-1', { nombre: 'Participación', peso: 40 });
      expect(result.id).toBe('config-new');
    });
  });

  // ─── updateConfig ─────────────────────────────────────────────────
  describe('updateConfig', () => {
    it('debe lanzar NotFoundException si la config no existe', async () => {
      mockPrisma.mod_tipo_calificacion_config.findUnique.mockResolvedValue(null);
      await expect(service.updateConfig('conf-999', { nombre: 'Nuevo' }))
        .rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el nuevo peso excede el máximo', async () => {
      mockPrisma.mod_tipo_calificacion_config.findUnique.mockResolvedValue({ id: 'c1', tipoProgramaId: 't1' });
      mockPrisma.programaTipo.findUnique.mockResolvedValue({ notaMaxima: 100 });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ peso: 80 }]);
      await expect(service.updateConfig('c1', { peso: 30 })).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar config si el peso es válido', async () => {
      mockPrisma.mod_tipo_calificacion_config.findUnique.mockResolvedValue({ id: 'c1', tipoProgramaId: 't1' });
      mockPrisma.programaTipo.findUnique.mockResolvedValue({ notaMaxima: 100 });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ peso: 40 }]);
      mockPrisma.mod_tipo_calificacion_config.update.mockResolvedValue({ id: 'c1' });
      const result = await service.updateConfig('c1', { peso: 60 });
      expect(mockPrisma.mod_tipo_calificacion_config.update).toHaveBeenCalled();
    });
  });

  // ─── deleteConfig ─────────────────────────────────────────────────
  describe('deleteConfig', () => {
    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.mod_tipo_calificacion_config.findUnique.mockResolvedValue(null);
      await expect(service.deleteConfig('conf-999')).rejects.toThrow(NotFoundException);
    });

    it('debe hacer soft delete (estado=inactivo)', async () => {
      mockPrisma.mod_tipo_calificacion_config.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.mod_tipo_calificacion_config.update.mockResolvedValue({ id: 'c1', estado: 'inactivo' });
      await service.deleteConfig('c1');
      expect(mockPrisma.mod_tipo_calificacion_config.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'inactivo' } })
      );
    });
  });

  // ─── aplicarConfigAModulo ─────────────────────────────────────────
  describe('aplicarConfigAModulo', () => {
    it('debe lanzar NotFoundException si el módulo no existe', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue(null);
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);
      await expect(service.aplicarConfigAModulo('mod-999', 'tipo-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si no hay configs para el tipo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({ id: 'mod-1' });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([]);
      await expect(service.aplicarConfigAModulo('mod-1', 'tipo-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si todas las categorías ya están aplicadas', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({ id: 'mod-1' });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ id: 'c1' }]);
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([{ configId: 'c1' }]);
      await expect(service.aplicarConfigAModulo('mod-1', 'tipo-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debe crear categorías nuevas y retornar conteo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({ id: 'mod-1' });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]);
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null); // no es master
      mockPrisma.mod_categoria_calificacion.createMany.mockResolvedValue({ count: 2 });
      const result = await service.aplicarConfigAModulo('mod-1', 'tipo-1');
      expect(result.aplicadas).toBe(2);
    });
  });

  // ─── getMateriaAsignada ───────────────────────────────────────────
  describe('getMateriaAsignada', () => {
    it('debe retornar las materias asignadas al facilitador', async () => {
      mockPrisma.programaDosFacilitador.findMany.mockResolvedValue([{ id: 'fac-1' }]);
      const result = await service.getMateriaAsignada('facilitador-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getAllModulos ─────────────────────────────────────────────────
  describe('getAllModulos', () => {
    it('debe retornar todos los módulos sin filtros', async () => {
      mockPrisma.programaModuloDos.findMany.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
      const result = await service.getAllModulos();
      expect(result).toHaveLength(2);
    });

    it('debe aplicar filtro de búsqueda por nombre', async () => {
      mockPrisma.programaModuloDos.findMany.mockResolvedValue([{ id: 'm1' }]);
      await service.getAllModulos({ search: 'Matemáticas' });
      expect(mockPrisma.programaModuloDos.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        })
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debe retornar categorías mapeadas con nombre y peso', async () => {
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        { id: 'cat-1', configId: 'c1', moduloId: 'm1', moduloMaestroId: null, config: { nombre: 'Examen', peso: 60, esEvalFinal: false, tipoProgramaId: 't1' } },
      ]);
      const result = await service.findAll('mod-1');
      expect(result[0].nombre).toBe('Examen');
      expect(result[0].peso).toBe(60);
    });
  });

  // ─── create ───────────────────────────────────────────────────────
  describe('create', () => {
    it('debe lanzar NotFoundException si el módulo no existe', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue(null);
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);
      await expect(service.create('mod-x', { nombre: 'X', ponderacion: 20 }))
        .rejects.toThrow(NotFoundException);
    });

    it('debe crear categoría y config para un módulo de instancia', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'mod-1',
        programaDos: { id: 'prog-1', tipoId: 'tipo-1', tipo: { notaMaxima: 100 } }
      });
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]);
      mockPrisma.mod_tipo_calificacion_config.create.mockResolvedValue({ id: 'cfg-1' });
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null); // no es master
      mockPrisma.mod_categoria_calificacion.create.mockResolvedValue({ id: 'cat-1' });

      const result = await service.create('mod-1', { nombre: 'Examen', ponderacion: 50 });
      expect(result.id).toBe('cat-1');
      expect(mockPrisma.mod_tipo_calificacion_config.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipoProgramaId: 'tipo-1', peso: 50 }) })
      );
    });

    it('debe crear categoría y config para un módulo maestro', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue(null);
      mockPrisma.programaModulo.findUnique.mockResolvedValue({
        id: 'mod-master',
        programa: { id: 'p-m', tipoId: 'tipo-master', tipo: { notaMaxima: 100 } }
      });
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]);
      mockPrisma.mod_tipo_calificacion_config.create.mockResolvedValue({ id: 'cfg-m' });
      mockPrisma.mod_categoria_calificacion.create.mockResolvedValue({ id: 'cat-m' });

      const result = await service.create('mod-master', { nombre: 'Master Category', ponderacion: 30 });
      expect(result.id).toBe('cat-m');
      expect(mockPrisma.mod_categoria_calificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ moduloMaestroId: 'mod-master' }) })
      );
    });

    it('debe lanzar BadRequestException si el peso total excede el máximo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'mod-1',
        programaDos: { tipo: { notaMaxima: 100 }, tipoId: 't1' }
      });
      // Ya tiene 80 pts acumulados
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        { config: { peso: 80 } }
      ]);
      await expect(service.create('mod-1', { nombre: 'Examen', ponderacion: 30 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────
  describe('update', () => {
    it('debe lanzar NotFoundException si la categoría no existe', async () => {
      mockPrisma.mod_categoria_calificacion.findUnique.mockResolvedValue(null);
      await expect(service.update('cat-x', { nombre: 'Nuevo' })).rejects.toThrow(NotFoundException);
    });

    it('debe actualizar nombre y ponderación correctamente', async () => {
      mockPrisma.mod_categoria_calificacion.findUnique.mockResolvedValue({
        id: 'cat-1', configId: 'cfg-1', moduloId: 'm1'
      });
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'm1', programaDos: { tipo: { notaMaxima: 100 } }
      });
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]); // otros son 0
      mockPrisma.mod_tipo_calificacion_config.update.mockResolvedValue({});
      // mock findAll at the end
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        { id: 'cat-1', config: { nombre: 'Nuevo', peso: 40 } }
      ]);

      const result = await service.update('cat-1', { nombre: 'Nuevo', ponderacion: 40 });
      expect(mockPrisma.mod_tipo_calificacion_config.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cfg-1' }, data: expect.objectContaining({ nombre: 'Nuevo', peso: 40 }) })
      );
    });

    it('debe lanzar BadRequestException si el nuevo peso excede el límite', async () => {
      mockPrisma.mod_categoria_calificacion.findUnique.mockResolvedValue({
        id: 'cat-1', configId: 'cfg-1', moduloId: 'm1'
      });
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({
        id: 'm1', programaDos: { tipo: { notaMaxima: 100 } }
      });
      // Otros ocupan 90 pts
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        { id: 'cat-other', config: { peso: 90 } }
      ]);

      await expect(service.update('cat-1', { ponderacion: 20 })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe lanzar NotFoundException si la categoría no existe', async () => {
      mockPrisma.mod_categoria_calificacion.findUnique.mockResolvedValue(null);
      await expect(service.remove('cat-999')).rejects.toThrow(NotFoundException);
    });

    it('debe hacer soft delete de la categoría', async () => {
      mockPrisma.mod_categoria_calificacion.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.mod_categoria_calificacion.update.mockResolvedValue({ id: 'cat-1', estado: 'inactivo' });
      await service.remove('cat-1');
      expect(mockPrisma.mod_categoria_calificacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'inactivo' } })
      );
    });
  });
});
