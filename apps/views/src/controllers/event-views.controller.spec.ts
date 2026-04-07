import { Test, TestingModule } from '@nestjs/testing';
import { EventViewsController } from './event-views.controller';
import { PrismaService } from '@app/database';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('EventViewsController (Blindaje Completo - 752 líneas)', () => {
  let controller: EventViewsController;

  const mockPrisma = {
    evento: { findFirst: jest.fn(), update: jest.fn() },
    eventoPersona: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    eventoInscripcion: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    eventoCuestionario: { findFirst: jest.fn(), findMany: jest.fn() },
    eventoCuestionarioIntento: { findFirst: jest.fn(), upsert: jest.fn() },
    evento_respuestas: { findFirst: jest.fn(), findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  };

  const mockPersona = {
    id: 'per-1',
    ci: BigInt(1234567),
    nombre1: 'JUAN',
    apellido1: 'PEREZ',
    fechaNacimiento: new Date('1990-01-01'),
    correo: 'juan@test.com',
    celular: '70000000',
  };

  const mockEvento = {
    id: 'evt-1',
    nombre: 'Evento de Prueba',
    estado: 'activo',
    inscripcionAbierta: true,
    codigoAsistencia: 'ABC123',
    fecha: new Date(),
    lugar: 'La Paz',
    cuestionarios: [],
    camposExtras: [],
    tipo: {},
    tenant: {},
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventViewsController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<EventViewsController>(EventViewsController);
  });

  // ─── getEvento ────────────────────────────────────────────────────
  describe('getEvento', () => {
    it('debería lanzar NotFoundException si el evento no existe', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(null);
      await expect(controller.getEvento('codigo-invalido'))
        .rejects.toThrow(NotFoundException);
    });

    it('debería retornar el evento con cuestionarios sanitizados (sin esCorrecta)', async () => {
      const eventoConCuestionario = {
        ...mockEvento,
        cuestionarios: [{
          id: 'cues-1',
          titulo: 'Test',
          preguntas: [{
            id: 'preg-1',
            texto: '¿Qué es?',
            opciones: [{ id: 'opc-1', texto: 'Respuesta', esCorrecta: true }],
          }],
        }],
      };
      mockPrisma.evento.findFirst.mockResolvedValue(eventoConCuestionario);

      const result = await controller.getEvento('codigo-evento');
      // La opción NO debe tener el campo esCorrecta
      expect(result.cuestionarios[0].preguntas[0].opciones[0]).not.toHaveProperty('esCorrecta');
    });

    it('debería aceptar búsqueda por UUID además de por código', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue({ ...mockEvento, cuestionarios: [], camposExtras: [] });
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      await controller.getEvento(uuid);
      expect(mockPrisma.evento.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.arrayContaining([{ id: uuid }]) })
        })
      );
    });
  });

  // ─── buscarPersona ────────────────────────────────────────────────
  describe('buscarPersona', () => {
    it('debería lanzar BadRequestException si faltan CI o fechaNacimiento', async () => {
      await expect(controller.buscarPersona({ ci: '', fechaNacimiento: '' }))
        .rejects.toThrow(BadRequestException);
    });

    it('debería retornar found=false si la persona no está en el padrón del evento', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(null);
      const result = await controller.buscarPersona({ ci: '1234567', fechaNacimiento: '1990-01-01' });
      expect(result.found).toBe(false);
    });

    it('debería retornar la persona con CI convertida a string', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      const result = await controller.buscarPersona({ ci: '1234567', fechaNacimiento: '1990-01-01' });
      expect(result.found).toBe(true);
      expect((result as any).persona.ci).toBe('1234567');
    });
  });

  // ─── inscribirse ──────────────────────────────────────────────────
  describe('inscribirse', () => {
    const inscripcionBody = {
      ci: '1234567', fechaNacimiento: '1990-01-01',
      nombre1: 'Juan', apellido1: 'Perez',
      correo: 'juan@test.com', celular: '70000000',
      departamentoId: 'dep-1', modalidadId: 'mod-1',
    };

    it('debería lanzar NotFoundException si el evento no existe', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(null);
      await expect(controller.inscribirse('evt-999', inscripcionBody))
        .rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si inscripción está cerrada', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue({ ...mockEvento, inscripcionAbierta: false });
      await expect(controller.inscribirse('evt-1', inscripcionBody))
        .rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar ConflictException si ya está inscrito', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoPersona.update.mockResolvedValue(mockPersona); // Añadido
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue({ id: 'ins-1' });
      await expect(controller.inscribirse('evt-1', inscripcionBody))
        .rejects.toThrow(ConflictException);
    });

    it('debería crear persona nueva y completar inscripción exitosamente', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(null); // No existe
      mockPrisma.eventoPersona.create.mockResolvedValue(mockPersona);
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue(null); // No inscrito
      mockPrisma.eventoInscripcion.create.mockResolvedValue({ id: 'new-ins' });
      mockPrisma.evento.update.mockResolvedValue({});

      const result = await controller.inscribirse('evt-1', inscripcionBody);
      expect(result.success).toBe(true);
      expect(mockPrisma.eventoPersona.create).toHaveBeenCalled();
      expect(mockPrisma.eventoInscripcion.create).toHaveBeenCalled();
    });

    it('debería actualizar persona existente y completar inscripción', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona); // Ya existe
      mockPrisma.eventoPersona.update.mockResolvedValue(mockPersona);
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue(null);
      mockPrisma.eventoInscripcion.create.mockResolvedValue({ id: 'new-ins' });
      mockPrisma.evento.update.mockResolvedValue({});

      const result = await controller.inscribirse('evt-1', inscripcionBody);
      expect(result.success).toBe(true);
      expect(mockPrisma.eventoPersona.update).toHaveBeenCalled();
    });
  });

  // ─── verificarInscripcion ─────────────────────────────────────────
  describe('verificarInscripcion', () => {
    it('debería retornar inscrito=false si persona no encontrada', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(null);
      const result = await controller.verificarInscripcion('evt-1', { ci: '0', fechaNacimiento: '2000-01-01' });
      expect(result.inscrito).toBe(false);
    });

    it('debería retornar inscrito=true con datos de inscripción', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue({ id: 'ins-1', asistencia: false, evento: mockEvento });
      const result = await controller.verificarInscripcion('evt-1', { ci: '1234567', fechaNacimiento: '1990-01-01' });
      expect(result.inscrito).toBe(true);
    });
  });

  // ─── registrarAsistencia ──────────────────────────────────────────
  describe('registrarAsistencia', () => {
    const asistBody = { ci: '1234567', fechaNacimiento: '1990-01-01', codigoAsistencia: 'ABC123' };

    it('debería lanzar NotFoundException si el evento no existe', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(null);
      await expect(controller.registrarAsistencia('evt-999', asistBody))
        .rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el código de asistencia es incorrecto', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      const wrongBody = { ...asistBody, codigoAsistencia: 'WRONG' };
      await expect(controller.registrarAsistencia('evt-1', wrongBody))
        .rejects.toThrow(ForbiddenException);
    });

    it('debería retornar yaRegistrada=true si ya tenía asistencia', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue({ id: 'ins-1', asistencia: true });

      const result = await controller.registrarAsistencia('evt-1', asistBody);
      expect(result.yaRegistrada).toBe(true);
    });

    it('debería registrar asistencia nueva exitosamente', async () => {
      mockPrisma.evento.findFirst.mockResolvedValue(mockEvento);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoInscripcion.findFirst.mockResolvedValue({ id: 'ins-1', asistencia: false });
      mockPrisma.eventoInscripcion.update.mockResolvedValue({});

      const result = await controller.registrarAsistencia('evt-1', asistBody);
      expect(result.success).toBe(true);
      expect(result.yaRegistrada).toBe(false);
      expect(mockPrisma.eventoInscripcion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { asistencia: true } })
      );
    });
  });

  // ─── marcarVideoVisto ─────────────────────────────────────────────
  describe('marcarVideoVisto', () => {
    it('debería lanzar NotFoundException si la persona no existe', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(null);
      await expect(controller.marcarVideoVisto('evt-1', 'cues-1', { ci: '0', fechaNacimiento: '2000-01-01' }))
        .rejects.toThrow(NotFoundException);
    });

    it('debería registrar el video como visto exitosamente', async () => {
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoCuestionarioIntento.upsert.mockResolvedValue({});

      const result = await controller.marcarVideoVisto('evt-1', 'cues-1', { ci: '1234567', fechaNacimiento: '1990-01-01' });
      expect(result.success).toBe(true);
      expect(mockPrisma.eventoCuestionarioIntento.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { videoCompletado: true } })
      );
    });
  });

  // ─── responderCuestionario ────────────────────────────────────────
  describe('responderCuestionario', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 100000);
    const future = new Date(now.getTime() + 100000);

    const mockCuestionario = {
      id: 'cues-1', titulo: 'Test', esEvaluativo: false, urlVideo: null,
      fechaInicio: past, fechaFin: future,
      limiteIntentos: null, puntosMaximos: null, cantidadPreguntas: null,
      preguntas: [
        { id: 'preg-1', tipo: 'SINGLE', puntos: 10, opciones: [{ id: 'opc-1', texto: 'A', esCorrecta: true }] },
      ],
    };

    it('debería lanzar NotFoundException si el cuestionario no existe', async () => {
      mockPrisma.eventoCuestionario.findFirst.mockResolvedValue(null);
      await expect(controller.responderCuestionario('evt-1', 'cues-999', { ci: '1', fechaNacimiento: '2000-01-01', respuestas: [] }))
        .rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el cuestionario aún no ha comenzado', async () => {
      mockPrisma.eventoCuestionario.findFirst.mockResolvedValue({ ...mockCuestionario, fechaInicio: future });
      await expect(controller.responderCuestionario('evt-1', 'cues-1', { ci: '1', fechaNacimiento: '2000-01-01', respuestas: [] }))
        .rejects.toThrow(ForbiddenException);
    });

    it('debería completar un formulario no evaluativo exitosamente', async () => {
      mockPrisma.eventoCuestionario.findFirst.mockResolvedValue(mockCuestionario);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoCuestionarioIntento.findFirst.mockResolvedValue(null);
      mockPrisma.evento_respuestas.findFirst.mockResolvedValue(null);
      mockPrisma.evento_respuestas.createMany.mockResolvedValue({});
      mockPrisma.eventoCuestionarioIntento.upsert.mockResolvedValue({});

      const result = await controller.responderCuestionario('evt-1', 'cues-1', {
        ci: '1234567', fechaNacimiento: '1990-01-01',
        respuestas: [{ preguntaId: 'preg-1', opcionId: 'opc-1' }],
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.evento_respuestas.createMany).toHaveBeenCalled();
    });

    it('debería calcular la nota correctamente para cuestionario evaluativo', async () => {
      const evalCuest = { ...mockCuestionario, esEvaluativo: true, puntosMaximos: 10 };
      mockPrisma.eventoCuestionario.findFirst.mockResolvedValue(evalCuest);
      mockPrisma.eventoPersona.findFirst.mockResolvedValue(mockPersona);
      mockPrisma.eventoCuestionarioIntento.findFirst.mockResolvedValue(null);
      mockPrisma.evento_respuestas.findFirst.mockResolvedValue(null);
      mockPrisma.evento_respuestas.createMany.mockResolvedValue({});
      mockPrisma.eventoCuestionarioIntento.upsert.mockResolvedValue({});

      const result = await controller.responderCuestionario('evt-1', 'cues-1', {
        ci: '1234567', fechaNacimiento: '1990-01-01',
        respuestas: [{ preguntaId: 'preg-1', opcionId: 'opc-1' }], // Respuesta correcta
      });

      expect(result.esEvaluativo).toBe(true);
      expect(result.puntaje).toBe(10);
      expect(result.nota).toBe(100); // 10/10 * 100 = 100
    });
  });
});
