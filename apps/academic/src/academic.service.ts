import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una versión operativa (ProgramaDos) a partir de un maestro (Programa)
   * Realiza un Snapshot de todos los datos para que sea independiente del maestro.
   */
  async crearVersionDesdeMaster(masterId: string, versionData: any, user: any) {
    const master = await this.prisma.programa.findUnique({
      where: { id: masterId },
      include: { modulos: true },
    });

    if (!master) throw new NotFoundException('Programa Maestro no encontrado');

    const { modulos, turnos, ...rest } = versionData;

    // Snapshot de los datos del maestro + variables de la versión
    const version = await this.prisma.programaDos.create({
      data: {
        nombre: rest.nombre || master.nombre,
        nombreAbreviado: rest.nombreAbreviado || master.nombreAbreviado,
        codigo: rest.codigo || master.codigo,
        contenido: rest.contenido || master.contenido,
        horario: rest.horario || master.horario,
        cargaHoraria: rest.cargaHoraria || master.cargaHoraria,
        costo: rest.costo || master.costo,
        banner: rest.banner || master.banner,
        afiche: rest.afiche || master.afiche,
        convocatoria: rest.convocatoria || master.convocatoria,
        fechaInicioInscripcion: rest.fechaInicioInscripcion
          ? new Date(rest.fechaInicioInscripcion)
          : master.fechaInicioInscripcion,
        fechaFinInscripcion: rest.fechaFinInscripcion
          ? new Date(rest.fechaFinInscripcion)
          : master.fechaFinInscripcion,
        fechaInicioClases: rest.fechaInicioClases
          ? new Date(rest.fechaInicioClases)
          : master.fechaInicioClases,
        estadoInscripcion: rest.estadoInscripcion ?? master.estadoInscripcion,
        estado: rest.estado || master.estado,

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
              orden: m.orden || 0,
              moduloMaestroId: m.id || m.moduloId || null,
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
                  turnoId: t.turnoIds || t.turnoId || t.id,
                  cupo: Number(t.cupo),
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

  // Inscripciones vinculadas a la versión operativa (ProgramaDos)
  async inscribir(data: any, user: any) {
    let estadoInscripcionId = data.estadoInscripcionId;

    if (!estadoInscripcionId) {
      const defaultState =
        await this.prisma.programa_inscripcion_estado.findFirst({
          where: { nombre: { contains: 'INSCRITO', mode: 'insensitive' } },
        });
      estadoInscripcionId = defaultState?.id;
    }

    const inscripcion = await this.prisma.programaInscripcion.create({
      data: {
        programaId: data.programaId, // Referencia a ProgramaDos (Snapshot)
        personaId: data.personaId,
        sedeId: data.sedeId,
        turnoId: data.turnoId,
        estadoInscripcionId: estadoInscripcionId,
        createdBy: user?.id || null,
      },
    });

    // Asignar rol PARTICIPANTE automáticamente si no lo tiene ya
    const rolePart = await this.prisma.role.findFirst({
      where: { name: { contains: 'PARTICIPANTE', mode: 'insensitive' } },
    });
    if (rolePart) {
      const alreadyHasRole = await this.prisma.userRole.findFirst({
        where: { userId: data.personaId, roleId: rolePart.id },
      });
      if (!alreadyHasRole) {
        await this.prisma.userRole.create({
          data: {
            userId: data.personaId,
            roleId: rolePart.id,
            modelType: 'App\\Models\\User',
          },
        });
      }
    }

    return inscripcion;
  }
}
