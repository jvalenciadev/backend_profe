import { Test, TestingModule } from '@nestjs/testing';
import { AcademicService } from './academic.service';
import { PrismaService } from '@app/database';
import { NotFoundException } from '@nestjs/common';

describe('AcademicService (Unit Tests)', () => {
  let service: AcademicService;

  const mockPrisma = {
    programa: { findUnique: jest.fn() },
    programaDos: { create: jest.fn() },
    programa_inscripcion_estado: { findFirst: jest.fn() },
    programaInscripcion: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
  });

  describe('crearVersionDesdeMaster', () => {
    it('debería lanzar NotFoundException si el programa maestro no existe', async () => {
      mockPrisma.programa.findUnique.mockResolvedValue(null);
      await expect(
        service.crearVersionDesdeMaster('m1', {}, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería realizar un snapshot de los datos del maestro y crear una versión operativa (ProgramaDos)', async () => {
      const mockMaster = {
        id: 'm1',
        nombre: 'Maestro Program',
        modulos: [
          { id: 'mod-m1', nombre: 'Modulo 1', esGlobal: false, orden: 1 },
        ],
        duracionId: 'd1',
        tipoId: 't1',
        modalidadId: 'mod1',
      };
      mockPrisma.programa.findUnique.mockResolvedValue(mockMaster);
      mockPrisma.programaDos.create.mockResolvedValue({
        id: 'v1',
        nombre: 'Maestro Program',
      });

      const versionData = {
        versionId: 'ver-2026',
        sedeId: 'sede-1',
        turnos: [{ id: 't1', cupo: 30 }],
      };
      const user = { id: 'admin-1' };

      const result = await service.crearVersionDesdeMaster(
        'm1',
        versionData,
        user,
      );

      expect(result.id).toBe('v1');
      expect(mockPrisma.programaDos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Maestro Program',
            programaId: 'm1',
            sedeId: 'sede-1',
            modulos: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ nombre: 'Modulo 1' }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('inscribir', () => {
    it('debería crear una inscripción con estado INSCRITO por defecto si no se provee', async () => {
      mockPrisma.programa_inscripcion_estado.findFirst.mockResolvedValue({
        id: 'est-inscrito',
      });
      mockPrisma.programaInscripcion.create.mockResolvedValue({ id: 'ins-1' });

      const data = {
        programaId: 'v1',
        personaId: 'u1',
        sedeId: 's1',
        turnoId: 't1',
      };
      const user = { id: 'admin-1' };

      const result = await service.inscribir(data, user);

      expect(result.id).toBe('ins-1');
      expect(
        mockPrisma.programa_inscripcion_estado.findFirst,
      ).toHaveBeenCalled();
      expect(mockPrisma.programaInscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estadoInscripcionId: 'est-inscrito',
          }),
        }),
      );
    });

    it('debería usar el estadoInscripcionId de los datos si se provee', async () => {
      mockPrisma.programaInscripcion.create.mockResolvedValue({ id: 'ins-2' });

      const data = {
        programaId: 'v1',
        personaId: 'u1',
        estadoInscripcionId: 'est-confirmado',
      };
      await service.inscribir(data, {});

      expect(mockPrisma.programaInscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estadoInscripcionId: 'est-confirmado',
          }),
        }),
      );
    });
  });
});
