import { Test, TestingModule } from '@nestjs/testing';
import { CuestionarioAppService } from './cuestionario-app.service';
import { CuestionarioService } from './cuestionario.service';
import { PrismaService } from '@app/database';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('CuestionarioAppService (Blindaje Completo)', () => {
  let service: CuestionarioAppService;

  const mockPrisma = {
    mod_cuestionario: { findFirst: jest.fn(), findUnique: jest.fn() },
    mod_intento: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mod_nota_actividad: { findUnique: jest.fn() },
  };

  const mockBaseService = {
    resolverRespuesta: jest.fn().mockResolvedValue({}),
    finalizarIntento: jest.fn().mockResolvedValue({
      id: 'intento-1',
      estado: 'finalizado',
      puntajeTotal: 85,
      respuestas: [],
    }),
  };

  const mockCuestionario = {
    id: 'cue-1',
    actividadId: 'act-1',
    duracion: 60,
    maxIntentos: 3,
    mostrarNota: true,
    retroInmediata: false,
    soloMobile: false,
    bloquearCopia: false,
    aleatorizar: false,
    randomCount: null,
    actividad: {
      titulo: 'Examen Módulo 1',
      instrucciones: 'Responda con cuidado',
      puntajeMax: 100,
    },
    preguntas: [
      {
        id: 'preg-1',
        texto: '¿Cuánto es 2+2?',
        tipo: 'opcion_multiple',
        puntaje: 10,
        imagen: null,
        orden: 1,
        estado: 'activo',
        opciones: [
          { id: 'op-1', texto: '3', orden: 1, esCorrecta: false },
          { id: 'op-2', texto: '4', orden: 2, esCorrecta: true },
        ],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuestionarioAppService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CuestionarioService, useValue: mockBaseService },
      ],
    }).compile();

    service = module.get<CuestionarioAppService>(CuestionarioAppService);
  });

  // ─── getInfo ─────────────────────────────────────────────────────────
  describe('getInfo', () => {
    it('debe lanzar NotFoundException si el cuestionario no existe', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(null);
      await expect(service.getInfo('cue-inexistente', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar info del cuestionario sin intentos', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.findMany.mockResolvedValue([]);

      const result = await service.getInfo('cue-1', 'user-1');

      expect(result.cuestionario.titulo).toBe('Examen Módulo 1');
      expect(result.cuestionario.duracionMinutos).toBe(60);
      expect(result.estadoUsuario.intentosRealizados).toBe(0);
      expect(result.estadoUsuario.intentosRestantes).toBe(3);
      expect(result.estadoUsuario.intentoEnProgreso).toBeNull();
      expect(result.estadoUsuario.mejorPuntaje).toBe(0);
    });

    it('debe detectar intento en progreso y calcular tiempo restante', async () => {
      const iniciadoEn = new Date(Date.now() - 10 * 60 * 1000); // hace 10 min
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.findMany.mockResolvedValue([
        { id: 'int-1', estado: 'en_progreso', iniciadoEn, puntajeTotal: 0, respuestas: [] },
      ]);

      const result = await service.getInfo('cue-1', 'user-1');
      expect(result.estadoUsuario.intentoEnProgreso).not.toBeNull();
      expect(result.estadoUsuario.intentoEnProgreso?.id).toBe('int-1');
      // 60 min - 10 min = 50 min restantes → > 0
      expect(result.estadoUsuario.intentoEnProgreso?.tiempoRestanteMs).toBeGreaterThan(0);
    });

    it('debe calcular la mejor puntuación correctamente', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.findMany.mockResolvedValue([
        { id: 'int-1', estado: 'finalizado', iniciadoEn: new Date(), puntajeTotal: 60, respuestas: [] },
        { id: 'int-2', estado: 'finalizado', iniciadoEn: new Date(), puntajeTotal: 85, respuestas: [] },
        { id: 'int-3', estado: 'finalizado', iniciadoEn: new Date(), puntajeTotal: 70, respuestas: [] },
      ]);

      const result = await service.getInfo('cue-1', 'user-1');
      expect(result.estadoUsuario.mejorPuntaje).toBe(85);
    });
  });

  // ─── iniciarIntento ──────────────────────────────────────────────────
  describe('iniciarIntento', () => {
    it('debe lanzar NotFoundException si el cuestionario no existe', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(null);
      await expect(service.iniciarIntento('cue-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar UnauthorizedException si ya se agotaron los intentos', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.count.mockResolvedValue(3); // maxIntentos = 3
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null); // sin intento en progreso
      await expect(service.iniciarIntento('cue-1', 'user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe reanudar intento en progreso si ya existe', async () => {
      const intentoExistente = {
        id: 'int-exist',
        numero: 1,
        iniciadoEn: new Date(),
        estado: 'en_progreso',
        respuestas: [{ preguntaId: 'preg-1', opcionId: null, textoLibre: null }],
      };
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.count.mockResolvedValue(1);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(intentoExistente);

      const result = await service.iniciarIntento('cue-1', 'user-1');
      expect(result.intento.id).toBe('int-exist');
      expect(mockPrisma.mod_intento.create).not.toHaveBeenCalled();
    });

    it('debe crear nuevo intento si no hay uno en progreso', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.count.mockResolvedValue(0);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null);
      mockPrisma.mod_intento.create.mockResolvedValue({
        id: 'int-new',
        numero: 1,
        iniciadoEn: new Date(),
        estado: 'en_progreso',
        respuestas: [{ preguntaId: 'preg-1', opcionId: null, textoLibre: null }],
      });

      const result = await service.iniciarIntento('cue-1', 'user-1');
      expect(result.intento.id).toBe('int-new');
      expect(mockPrisma.mod_intento.create).toHaveBeenCalledTimes(1);
    });

    it('NO debe enviar esCorrecta en las opciones (seguridad anti-trampa)', async () => {
      mockPrisma.mod_cuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.mod_intento.count.mockResolvedValue(0);
      mockPrisma.mod_intento.findFirst.mockResolvedValue(null);
      mockPrisma.mod_intento.create.mockResolvedValue({
        id: 'int-sec',
        numero: 1,
        iniciadoEn: new Date(),
        estado: 'en_progreso',
        respuestas: [{ preguntaId: 'preg-1', opcionId: null, textoLibre: null }],
      });

      const result = await service.iniciarIntento('cue-1', 'user-1');
      const opciones = result.preguntas[0]?.opciones;
      // ninguna opción debe tener la propiedad esCorrecta
      opciones?.forEach((op: any) => {
        expect(op).not.toHaveProperty('esCorrecta');
      });
    });
  });

  // ─── guardarProgreso ─────────────────────────────────────────────────
  describe('guardarProgreso', () => {
    it('debe lanzar UnauthorizedException si el intento no existe', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue(null);
      await expect(
        service.guardarProgreso('int-x', 'user-1', []),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el intento no pertenece al usuario', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'otro-user',
        estado: 'en_progreso',
      });
      await expect(
        service.guardarProgreso('int-1', 'user-correcto', []),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el intento ya fue finalizado', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'user-1',
        estado: 'finalizado',
      });
      await expect(
        service.guardarProgreso('int-1', 'user-1', []),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe guardar progreso y retornar success=true', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'user-1',
        estado: 'en_progreso',
      });

      const result = await service.guardarProgreso('int-1', 'user-1', [
        { preguntaId: 'preg-1', opcionId: 'op-2' },
      ]);

      expect(result.success).toBe(true);
      expect(mockBaseService.resolverRespuesta).toHaveBeenCalledTimes(1);
    });
  });

  // ─── finalizarIntento ─────────────────────────────────────────────────
  describe('finalizarIntento', () => {
    it('debe lanzar UnauthorizedException si el intento no existe', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue(null);
      await expect(
        service.finalizarIntento('int-x', 'user-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el intento no pertenece al usuario', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'otro-user',
        cuestionario: { mostrarNota: false, retroInmediata: false },
      });
      await expect(
        service.finalizarIntento('int-1', 'user-real'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe finalizar intento y retornar resultado básico (sin nota ni retro)', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'user-1',
        cuestionario: { id: 'cue-1', actividadId: 'act-1', mostrarNota: false, retroInmediata: false },
      });

      const result = await service.finalizarIntento('int-1', 'user-1');
      expect(result.estado).toBe('finalizado');
      expect(result).not.toHaveProperty('puntajeTotalObtenido');
      expect(result).not.toHaveProperty('retroalimentacion');
    });

    it('debe incluir puntaje si mostrarNota=true', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'user-1',
        cuestionario: { id: 'cue-1', actividadId: 'act-1', mostrarNota: true, retroInmediata: false },
      });
      mockPrisma.mod_nota_actividad.findUnique.mockResolvedValue({ nota: 85 });

      const result = await service.finalizarIntento('int-1', 'user-1');
      expect(result.puntajeTotalObtenido).toBe(85);
      expect(result.notaFinalMapeada).toBe(85);
    });

    it('debe guardar motivo de bloqueo si se provee', async () => {
      mockPrisma.mod_intento.findUnique.mockResolvedValue({
        id: 'int-1',
        userId: 'user-1',
        cuestionario: { id: 'cue-1', actividadId: 'act-1', mostrarNota: false, retroInmediata: false },
      });
      mockPrisma.mod_intento.update.mockResolvedValue({});

      await service.finalizarIntento('int-1', 'user-1', 'Cambio de pestaña detectado');
      expect(mockPrisma.mod_intento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { motivoBloqueo: 'Cambio de pestaña detectado' },
        }),
      );
    });
  });
});
