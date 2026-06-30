import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class CreateAcademicVersionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una versión operativa (ProgramaDos) a partir de un maestro (Programa)
   * Realiza un Snapshot de todos los datos para que sea independiente del maestro.
   */
  async execute(masterId: string, versionData: any, user: any) {
    const master = await this.prisma.programa.findUnique({
      where: { id: masterId },
      include: { modulos: true },
    });

    if (!master) throw new NotFoundException('Programa Maestro no encontrado');

    const { modulos, turnos, ...rest } = versionData;

    // Validación de versión automática y secuencial
    if (!rest.versionId) {
      throw new BadRequestException('Debe seleccionar una versión o gestión de referencia');
    }

    const selectedVersion = await this.prisma.programaVersion.findUnique({
      where: { id: rest.versionId },
    });

    if (!selectedVersion) {
      throw new NotFoundException('La versión de referencia seleccionada no existe');
    }

    const gestion = selectedVersion.gestion;

    // Contar cuántas ofertas operativas activas del mismo programa ya existen en esta gestión para la misma Sede
    const existingOffersCount = await this.prisma.programaDos.count({
      where: {
        programaId: masterId,
        sedeId: rest.sedeId,
        version: {
          gestion: gestion,
        },
        deletedAt: null,
      },
    });

    const siguienteNumero = existingOffersCount + 1;

    // Buscar si existe esa versión (número secuencial) en el catálogo de versiones para esta gestión
    const targetVersion = await this.prisma.programaVersion.findFirst({
      where: {
        gestion: gestion,
        numero: siguienteNumero,
        deletedAt: null,
        estado: 'activo',
      },
    });

    if (!targetVersion) {
      throw new BadRequestException(
        `No se puede registrar la oferta. La Versión ${siguienteNumero} para la gestión ${gestion} no está habilitada. El administrador debe habilitar nuevas versiones.`,
      );
    }

    // Usar la versión calculada secuencialmente
    rest.versionId = targetVersion.id;

    // Snapshot de los datos del maestro + variables de la versión
    const {
      fechaIniIns,
      fechaInicioInscripcion,
      fechaFinIns,
      fechaFinInscripcion,
      fechaIniClase,
      fechaInicioClases,
      nombreAbre,
      nombreAbreviado,
      estado,
      ...restValues
    } = rest;

    const version = await this.prisma.programaDos.create({
      data: {
        nombre: restValues.nombre || master.nombre,
        nombreAbreviado:
          nombreAbre || nombreAbreviado || master.nombreAbreviado,
        codigo: restValues.codigo || master.codigo,
        contenido: restValues.contenido || master.contenido,
        horario: restValues.horario || master.horario,
        cargaHoraria: restValues.cargaHoraria || master.cargaHoraria,
        costo: restValues.costo || master.costo,
        banner: restValues.banner || master.banner,
        afiche: restValues.afiche || master.afiche,
        convocatoria: restValues.convocatoria || master.convocatoria,
        fechaInicioInscripcion:
          fechaIniIns || fechaInicioInscripcion
            ? new Date(fechaIniIns || fechaInicioInscripcion)
            : master.fechaInicioInscripcion,
        fechaFinInscripcion:
          fechaFinIns || fechaFinInscripcion
            ? new Date(fechaFinIns || fechaFinInscripcion)
            : master.fechaFinInscripcion,
        fechaInicioClases:
          fechaIniClase || fechaInicioClases
            ? new Date(fechaIniClase || fechaInicioClases)
            : master.fechaInicioClases,
        estadoInscripcion:
          restValues.estadoInscripcion ?? master.estadoInscripcion,
        estado: (estado || master.estado || 'activo').toLowerCase(),

        // Relations
        programaId: masterId,
        sedeId: rest.sedeId || null,
        departamentoId: rest.departamentoId || null,
        duracionId: rest.duracionId || master.duracionId,
        versionId: rest.versionId, // Must be provided in versionData
        tipoId: rest.tipoId || master.tipoId,
        modalidadId: rest.modalidadId || master.modalidadId,

        createdBy: user?.id || null,

        // Snapshot of modules
        modulos: {
          create: (modulos && modulos.length > 0
            ? modulos
            : master.modulos.sort(
                (a: any, b: any) => (a.orden || 0) - (b.orden || 0),
              )
          )
            .filter((m: any) => !m.esGlobal)
            .map((m: any) => ({
              nombre: m.nombre,
              codigo: m.codigo,
              descripcion: m.descripcion,
              moduloMaestroId: m.id || m.moduloId || null,
              esGlobal: m.esGlobal || false,
              orden: m.orden ?? m.pm_orden ?? 0,
              // Las fechas solo existen en ProgramaModuloDos (Versiones), no en el Maestro
              fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
              fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
              estado: m.estado || 'activo',
              createdBy: user?.id || null,
            })),
        },
        // Setup turns for this offering
        turnos:
          turnos && turnos.length > 0
            ? {
                create: turnos.map((t: any) => ({
                  turnoId: t.turnoIds || t.turnoId || t.id, // Support both ID formats from UI
                  cupo: Number(t.cupo) || 0,
                  cupoPre: Number(t.cupoPre) || 0,
                  estado: t.estado || 'activo',
                  createdBy: user?.id || null,
                })),
              }
            : undefined,
      },
      include: { modulos: true, turnos: true },
    });

    return version;
  }
}
