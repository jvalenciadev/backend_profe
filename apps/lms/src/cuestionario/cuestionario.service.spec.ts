import { Test, TestingModule } from '@nestjs/testing';
import { CuestionarioService } from './cuestionario.service';
import { PrismaService } from '@app/database';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('CuestionarioService (Blindaje Completo - 443 líneas)', () => {
  let service: CuestionarioService;

  const mockPrisma = {
    mod_cuestionario: { findUnique: jest.fn(), update: jest.fn() },
    mod_intento: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    mod_pregunta: { update: jest.fn(), create: jest.fn() },
    mod_opcion: { update: jest.fn(), create: jest.fn() },
    mod_respuesta: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    mod_actividad: { findUnique: jest.fn() },
    mod_nota_actividad: { upsert: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuestionarioService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CuestionarioService>(CuestionarioService);
  });

  // ─── getCuestionario ──────────────────────────────────────────────
  describe('getCuestionario', () => {
    it('debe retornar el cuestionario con preguntas y opciones', async () => {
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue({ id: 'cue-1', preguntas: [] });
      const result = await service.getCuestionario('cue-1');
      expect(result).toBeDefined();
      expect(mockPrisma.mod_cuestionario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cue-1' } })
      );
    });
  });

  // ─── getCuestionarioByActividad ────────────────────────────────────
  describe('getCuestionarioByActividad', () => {
    it('debe buscar por actividadId', async () => {
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue({ id: 'cue-1' });
      await service.getCuestionarioByActividad('act-1');
      expect(mockPrisma.mod_cuestionario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { actividadId: 'act-1' } })
      );
    });
  });

  // ─── updateCuestionario ────────────────────────────────────────────
  describe('updateCuestionario', () => {
    it('debe actualizar la configuración del cuestionario', async () => {
      const data = { duracion: 60, maxIntentos: 3, aleatorizar: true, mostrarNota: true, retroInmediata: false };
      mockPrisma.mod_cuestionario.update.mockResolvedValue({ id: 'cue-1', ...data });
      const result = await service.updateCuestionario('cue-1', data);
      expect(result).toBeDefined();
      expect(mockPrisma.mod_cuestionario.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cue-1' } })
      );
    });

    it('debe mapear soloMobile y bloquearCopia con nombres alternativos', async () => {
      const data = { mod_cue_solo_mobile: true, mod_cue_bloquear_copia: true };
      mockPrisma.mod_cuestionario.update.mockResolvedValue({});
      await service.updateCuestionario('cue-1', data);
      expect(mockPrisma.mod_cuestionario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ soloMobile: true, bloquearCopia: true }),
        })
      );
    });
  });

  // ─── syncPreguntas ─────────────────────────────────────────────────
  describe('syncPreguntas', () => {
    it('debe crear preguntas nuevas (isNew=true)', async () => {
      mockPrisma.mod_pregunta.create.mockResolvedValue({ id: 'preg-new' });
      const preguntas = [{
        isNew: true, texto: '¿Qué es?', tipo: 'MULTIPLE', puntaje: 10, orden: 1, imagen: null,
        opciones: [{ texto: 'A', esCorrecta: true, orden: 1 }],
      }];
      const result = await service.syncPreguntas('cue-1', preguntas);
      expect(result.success).toBe(true);
      expect(mockPrisma.mod_pregunta.create).toHaveBeenCalled();
    });

    it('debe actualizar preguntas e opciones existentes (id sin isNew)', async () => {
      mockPrisma.mod_pregunta.update.mockResolvedValue({});
      mockPrisma.mod_opcion.update.mockResolvedValue({});
      const preguntas = [{
        id: 'preg-1', isNew: false, texto: 'Actualizada', tipo: 'MULTIPLE', puntaje: 5, orden: 1, imagen: null,
        opciones: [{ id: 'opc-1', isNew: false, texto: 'Opción A', esCorrecta: false, orden: 1 }],
      }];
      const result = await service.syncPreguntas('cue-1', preguntas);
      expect(result.success).toBe(true);
      expect(mockPrisma.mod_pregunta.update).toHaveBeenCalled();
      expect(mockPrisma.mod_opcion.update).toHaveBeenCalled();
    });

    it('debe crear opciones nuevas (sin id) en preguntas existentes', async () => {
      mockPrisma.mod_pregunta.update.mockResolvedValue({});
      mockPrisma.mod_opcion.create.mockResolvedValue({});
      const preguntas = [{
        id: 'preg-1', isNew: false, texto: 'Q', tipo: 'MULTIPLE', puntaje: 5, orden: 1, imagen: null,
        opciones: [{ isNew: true, texto: 'Nueva opción', esCorrecta: true, orden: 2 }],
      }];
      await service.syncPreguntas('cue-1', preguntas);
      expect(mockPrisma.mod_opcion.create).toHaveBeenCalled();
    });
  });

  // ─── getLobbyData ──────────────────────────────────────────────────
  describe('getLobbyData', () => {
    it('debe lanzar NotFoundException si el cuestionario no existe', async () => {
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(null);
      await expect(service.getLobbyData('user-1', 'cue-99')).rejects.toThrow(NotFoundException);
    });

    it('debe retornar los datos del lobby con intentos restantes', async () => {
      const cue = { id: 'cue-1', maxIntentos: 3, preguntas: [] };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.findMany.mockResolvedValue([
        { estado: 'finalizado', puntajeTotal: 80 },
        { estado: 'finalizado', puntajeTotal: 90 },
      ]);
      const result = await service.getLobbyData('user-1', 'cue-1');
      expect(result.intentosConsumidos).toBe(2);
      expect(result.intentosRestantes).toBe(1);
      expect(result.mejorPuntaje).toBe(90);
    });

    it('debe detectar un intento en progreso y calcularlo bien', async () => {
      const cue = { id: 'cue-1', maxIntentos: 3, preguntas: [] };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.findMany.mockResolvedValue([
        { estado: 'en_progreso', puntajeTotal: 0 },
      ]);
      const result = await service.getLobbyData('user-1', 'cue-1');
      expect(result.intentoEnProgreso).toBeDefined();
      expect(result.intentosRestantes).toBe(2); // en_progreso no cuenta para restantes
    });
  });

  // ─── iniciarIntento ────────────────────────────────────────────────
  describe('iniciarIntento', () => {
    it('debe lanzar NotFoundException si el cuestionario no existe', async () => {
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(null);
      await expect(service.iniciarIntento('user-1', 'cue-99')).rejects.toThrow(NotFoundException);
    });

    it('debe retornar intento en progreso si ya existe uno', async () => {
      const cue = { id: 'cue-1', maxIntentos: 3, aleatorizar: false, preguntas: [] };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.count.mockResolvedValue(1);
      const intentoExistente = { id: 'int-1', estado: 'en_progreso', respuestas: [] };
      mockPrisma.mod_intento.findFirst.mockResolvedValue(intentoExistente);
      const result = await service.iniciarIntento('user-1', 'cue-1');
      expect(result.id).toBe('int-1');
      expect(mockPrisma.mod_intento.create).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si se alcanzó el límite de intentos', async () => {
      const cue = { id: 'cue-1', maxIntentos: 2, aleatorizar: false, preguntas: [] };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.count.mockResolvedValue(2);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null);
      await expect(service.iniciarIntento('user-1', 'cue-1')).rejects.toThrow(UnauthorizedException);
    });

    it('debe crear un nuevo intento con preguntas seleccionadas', async () => {
      const cue = {
        id: 'cue-1', maxIntentos: 3, aleatorizar: false, randomCount: null,
        preguntas: [{ id: 'p1' }, { id: 'p2' }],
      };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.count.mockResolvedValue(0);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null);
      mockPrisma.mod_intento.create.mockResolvedValue({ id: 'int-new', respuestas: [] });
      const result = await service.iniciarIntento('user-1', 'cue-1');
      expect(result.id).toBe('int-new');
      expect(mockPrisma.mod_intento.create).toHaveBeenCalled();
    });

    it('debe aleatorizar y limitar preguntas cuando randomCount está configurado', async () => {
      const cue = {
        id: 'cue-1', maxIntentos: 5, aleatorizar: true, randomCount: 2,
        preguntas: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      };
      mockPrisma.mod_cuestionario.findUnique.mockResolvedValue(cue);
      mockPrisma.mod_intento.count.mockResolvedValue(0);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null);
      mockPrisma.mod_intento.create.mockResolvedValue({ id: 'int-rand', respuestas: [] });
      await service.iniciarIntento('user-1', 'cue-1');
      const createCall = (mockPrisma.mod_intento.create as jest.Mock).mock.calls[0][0];
      // Solo 2 preguntas deben ser seleccionadas
      expect(createCall.data.respuestas.create).toHaveLength(2);
    });
  });

  // ─── resolverRespuesta ─────────────────────────────────────────────
  describe('resolverRespuesta', () => {
    it('debe actualizar respuesta existente', async () => {
      mockPrisma.mod_respuesta.findFirst.mockResolvedValue({ id: 'resp-1' });
      mockPrisma.mod_respuesta.update.mockResolvedValue({ id: 'resp-1' });
      const result = await service.resolverRespuesta('int-1', { preguntaId: 'p1', opcionId: 'opc-1' });
      expect(mockPrisma.mod_respuesta.update).toHaveBeenCalled();
    });

    it('debe crear repuesta si no existía antes', async () => {
      mockPrisma.mod_respuesta.findFirst.mockResolvedValue(null);
      mockPrisma.mod_respuesta.create.mockResolvedValue({ id: 'resp-new' });
      await service.resolverRespuesta('int-1', { preguntaId: 'p1', opcionId: 'opc-2' });
      expect(mockPrisma.mod_respuesta.create).toHaveBeenCalled();
    });
  });

  // ─── finalizarIntento ──────────────────────────────────────────────
  describe('finalizarIntento', () => {
    it('debe lanzar NotFoundException si el intento no existe', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue(null);
      await expect(service.finalizarIntento('int-99')).rejects.toThrow(NotFoundException);
    });

    it('debe retornar intento si ya estaba finalizado', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({ id: 'int-1', estado: 'finalizado' });
      const result = await service.finalizarIntento('int-1');
      expect(result!.estado).toBe('finalizado');
      expect(mockPrisma.mod_intento.update).not.toHaveBeenCalled();
    });

    it('debe calcular nota y finalizar intento con respuesta MULTIPLE correcta', async () => {
      const intento = {
        id: 'int-1', estado: 'en_progreso', userId: 'u1',
        cuestionario: {
          actividadId: 'act-1',
          preguntas: [{
            id: 'p1', tipo: 'MULTIPLE', puntaje: 10,
            opciones: [{ id: 'opc-1', esCorrecta: true }, { id: 'opc-2', esCorrecta: false }],
          }],
        },
        respuestas: [{ id: 'resp-1', preguntaId: 'p1', opcionId: 'opc-1', textoLibre: null }],
      };
      mockPrisma.mod_intento.findUnique.mockResolvedValue(intento);
      mockPrisma.mod_respuesta.update.mockResolvedValue({});
      mockPrisma.mod_actividad.findUnique.mockResolvedValue({ id: 'act-1', puntajeMax: 10 });
      mockPrisma.mod_intento.update.mockResolvedValue({ id: 'int-1', estado: 'finalizado', userId: 'u1', cuestionario: { actividadId: 'act-1' } });
      mockPrisma.mod_nota_actividad.upsert.mockResolvedValue({});

      const result = await service.finalizarIntento('int-1');
      expect(result!.estado).toBe('finalizado');
      // Verificar que la respuesta correcta se marcó
      expect(mockPrisma.mod_respuesta.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ esCorrecta: true, puntaje: 10 }) })
      );
    });

    it('debe calcular nota 0 para respuesta MULTIPLE incorrecta', async () => {
      const intento = {
        id: 'int-1', estado: 'en_progreso', userId: 'u1',
        cuestionario: {
          actividadId: 'act-1',
          preguntas: [{
            id: 'p1', tipo: 'MULTIPLE', puntaje: 10,
            opciones: [{ id: 'opc-correcta', esCorrecta: true }, { id: 'opc-mala', esCorrecta: false }],
          }],
        },
        respuestas: [{ id: 'resp-1', preguntaId: 'p1', opcionId: 'opc-mala', textoLibre: null }],
      };
      mockPrisma.mod_intento.findUnique.mockResolvedValue(intento);
      mockPrisma.mod_respuesta.update.mockResolvedValue({});
      mockPrisma.mod_actividad.findUnique.mockResolvedValue({ puntajeMax: 10 });
      mockPrisma.mod_intento.update.mockResolvedValue({ id: 'int-1', estado: 'finalizado', userId: 'u1', cuestionario: { actividadId: 'act-1' } });
      mockPrisma.mod_nota_actividad.upsert.mockResolvedValue({});

      await service.finalizarIntento('int-1');
      expect(mockPrisma.mod_respuesta.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ esCorrecta: false, puntaje: 0 }) })
      );
    });

    it('debe calcular nota para pregunta tipo TEXTO (siempre 0, calificación manual)', async () => {
      const intento = {
        id: 'int-1', estado: 'en_progreso', userId: 'u1',
        cuestionario: {
          actividadId: 'act-1',
          preguntas: [{ id: 'p1', tipo: 'TEXTO', puntaje: 10, opciones: [] }],
        },
        respuestas: [{ id: 'resp-1', preguntaId: 'p1', opcionId: null, textoLibre: 'Mi respuesta' }],
      };
      mockPrisma.mod_intento.findUnique.mockResolvedValue(intento);
      mockPrisma.mod_respuesta.update.mockResolvedValue({});
      mockPrisma.mod_actividad.findUnique.mockResolvedValue({ puntajeMax: 10 });
      mockPrisma.mod_intento.update.mockResolvedValue({ id: 'int-1', estado: 'finalizado', userId: 'u1', cuestionario: { actividadId: 'act-1' } });
      mockPrisma.mod_nota_actividad.upsert.mockResolvedValue({});

      await service.finalizarIntento('int-1');
      expect(mockPrisma.mod_respuesta.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ esCorrecta: false, puntaje: 0 }) })
      );
    });
  });
});
