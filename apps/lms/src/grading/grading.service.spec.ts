import { Test, TestingModule } from '@nestjs/testing';
import { GradingService } from './grading.service';
import { PrismaService } from '@app/database';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('GradingService (Unit Tests)', () => {
  let service: GradingService;

  const mockPrisma = {
    programaDosFacilitador: { findFirst: jest.fn() },
    programaModulo: { findFirst: jest.fn(), findUnique: jest.fn() },
    programaModuloDos: { findUnique: jest.fn() },
    mod_categoria_calificacion: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    mod_tipo_calificacion_config: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    mod_actividad: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GradingService>(GradingService);
  });

  describe('verifyFacilitador (private)', () => {
    it('debería retornar asignación si es facilitador de módulo LMS', async () => {
      const mockAsignacion = { facilitadorId: 'u1', moduloId: 'm1', programaDos: { tipo: { id: 't1' } } };
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValueOnce(mockAsignacion);

      // Usamos any para acceder a método privado para testing
      const result = await (service as any).verifyFacilitador('u1', 'm1');
      expect(result).toEqual(mockAsignacion);
    });

    it('debería retornar asignación si es facilitador de módulo maestro', async () => {
      mockPrisma.programaDosFacilitador.findFirst
        .mockResolvedValueOnce(null) // no es LMS normal
        .mockResolvedValueOnce({ id: 'asig-m', programaDos: { tipo: { id: 't1' } } }); // sí es maestro

      const result = await (service as any).verifyFacilitador('u1', 'm-maestro');
      expect(result.id).toBe('asig-m');
    });

    it('debería lanzar UnauthorizedException si no es facilitador', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue(null);
      mockPrisma.programaModulo.findFirst.mockResolvedValue(null);

      await expect((service as any).verifyFacilitador('u1', 'm999'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCategoriasModulo', () => {
    it('debería lanzar NotFoundException si no encuentra el módulo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue(null);
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);

      await expect(service.getCategoriasModulo('m999'))
        .rejects.toThrow(NotFoundException);
    });

    it('debería crear automáticamente las instancias de categorías si no existen en el módulo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({ id: 'm1', programaDos: { tipoId: 't1' } });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Parcial', peso: 30, orden: 0, esEvalFinal: false },
      ]);
      mockPrisma.mod_categoria_calificacion.findFirst.mockResolvedValue(null); // No existe instancia
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null); // No es maestro
      mockPrisma.mod_categoria_calificacion.create.mockResolvedValue({ id: 'inst-1', configId: 'c1', estado: 'activo' });

      const result = await service.getCategoriasModulo('m1');

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Parcial');
      expect(mockPrisma.mod_categoria_calificacion.create).toHaveBeenCalled();
    });

    it('debería retornar categorías existentes sin crearlas de nuevo', async () => {
      mockPrisma.programaModuloDos.findUnique.mockResolvedValue({ id: 'm1', programaDos: { tipoId: 't1' } });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Parcial', peso: 30, orden: 0, esEvalFinal: false },
      ]);
      mockPrisma.mod_categoria_calificacion.findFirst.mockResolvedValue({ id: 'inst-1', configId: 'c1', estado: 'activo' });

      const result = await service.getCategoriasModulo('m1');

      expect(result[0].id).toBe('inst-1');
      expect(mockPrisma.mod_categoria_calificacion.create).not.toHaveBeenCalled();
    });
  });

  describe('crearCategoria', () => {
    it('debería lanzar BadRequestException si el peso supera 100%', async () => {
      // Mock verifyFacilitador
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({ programaDos: { tipoId: 't1' } });
      // Mock existing weight
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([
        { config: { peso: 60 } },
        { config: { peso: 30 } }
      ]);

      await expect(service.crearCategoria('u1', 'm1', { nombre: 'Extra', peso: 20 }))
        .rejects.toThrow(BadRequestException);
    });

    it('debería crear una nueva configuración y vincularla al módulo', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({ programaDos: { tipoId: 't1' } });
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]); // Peso 0
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);
      mockPrisma.mod_categoria_calificacion.count.mockResolvedValue(0);
      mockPrisma.mod_tipo_calificacion_config.create.mockResolvedValue({ id: 'conf-new' });
      mockPrisma.mod_categoria_calificacion.create.mockResolvedValue({
        id: 'inst-new',
        configId: 'conf-new',
        config: { nombre: 'Nueva', peso: 10, esEvalFinal: false }
      });

      const result = await service.crearCategoria('u1', 'm1', { nombre: 'Nueva', peso: 10 });

      expect(result.nombre).toBe('Nueva');
      expect(mockPrisma.mod_tipo_calificacion_config.create).toHaveBeenCalled();
      expect(mockPrisma.mod_categoria_calificacion.create).toHaveBeenCalled();
    });
  });

  describe('aplicarPlantilla', () => {
    it('debería lanzar BadRequestException si no hay categorías en el Dashboard', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({ programaDos: { tipoId: 't1' } });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([]);

      await expect(service.aplicarPlantilla('u1', 'm1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debería crear instancias para las categorías que faltan', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({ programaDos: { tipoId: 't1' } });
      mockPrisma.mod_tipo_calificacion_config.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'A', peso: 50 },
        { id: 'c2', nombre: 'B', peso: 50 },
      ]);
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([{ configId: 'c1' }]); // Solo c1 existe
      mockPrisma.programaModulo.findUnique.mockResolvedValue(null);

      const result = await service.aplicarPlantilla('u1', 'm1');

      expect(result.aplicadas).toBe(1); // Solo c2 se aplica
      expect(mockPrisma.mod_categoria_calificacion.createMany).toHaveBeenCalled();
    });
  });

  describe('actualizarCategoria', () => {
    it('debería actualizar la configuración global vinculada a la instancia', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({});
      mockPrisma.mod_categoria_calificacion.findFirst.mockResolvedValue({ id: 'inst-1', configId: 'c1' });
      mockPrisma.mod_categoria_calificacion.findMany.mockResolvedValue([]); // For validatePeso
      mockPrisma.mod_tipo_calificacion_config.update.mockResolvedValue({
        nombre: 'Actualizada', peso: 40, esEvalFinal: true
      });

      const result = await service.actualizarCategoria('u1', 'm1', 'inst-1', { nombre: 'Actualizada', peso: 40 });

      expect(result.nombre).toBe('Actualizada');
      expect(mockPrisma.mod_tipo_calificacion_config.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' } })
      );
    });
  });

  describe('eliminarCategoria', () => {
    it('debería lanzar BadRequestException si hay actividades usando la categoría', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({});
      mockPrisma.mod_categoria_calificacion.findFirst.mockResolvedValue({ id: 'inst-1' });
      mockPrisma.mod_actividad.count.mockResolvedValue(5);

      await expect(service.eliminarCategoria('u1', 'm1', 'inst-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('debería marcar la instancia como inactiva si no tiene actividades', async () => {
      mockPrisma.programaDosFacilitador.findFirst.mockResolvedValue({});
      mockPrisma.mod_categoria_calificacion.findFirst.mockResolvedValue({ id: 'inst-1' });
      mockPrisma.mod_actividad.count.mockResolvedValue(0);

      const result = await service.eliminarCategoria('u1', 'm1', 'inst-1');

      expect(result.mensaje).toContain('correctamente');
      expect(mockPrisma.mod_categoria_calificacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'inactivo' } })
      );
    });
  });
});
