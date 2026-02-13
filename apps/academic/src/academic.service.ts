import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, GenericCrudService } from '@app/database';

@Injectable()
export class AcademicService extends GenericCrudService<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'programa'); // Default model is Programa (Master)
  }

  /**
   * Crea una versión operativa (ProgramaDos) a partir de un maestro (Programa)
   * Realiza un Snapshot de todos los datos para que sea independiente del maestro.
   */
  async crearVersionDesdeMaster(masterId: string, versionData: any, user: any) {
    const master = await this.prisma.programa.findUnique({
      where: { id: masterId },
      include: { modulos: true }
    });

    if (!master) throw new NotFoundException('Programa Maestro no encontrado');

    const { modulos, turnos, ...rest } = versionData;

    // Snapshot de los datos del maestro + variables de la versión
    const version = await this.prisma.programaDos.create({
      data: {
        nombre: rest.nombre || master.nombre,
        nombreAbre: rest.nombreAbre || master.nombreAbre,
        codigo: rest.codigo || master.codigo,
        contenido: rest.contenido || master.contenido,
        horario: rest.horario || master.horario,
        cargaHoraria: rest.cargaHoraria || master.cargaHoraria,
        costo: rest.costo || master.costo,
        banner: rest.banner || master.banner,
        afiche: rest.afiche || master.afiche,
        convocatoria: rest.convocatoria || master.convocatoria,
        fechaIniIns: rest.fechaIniIns ? new Date(rest.fechaIniIns) : master.fechaIniIns,
        fechaFinIns: rest.fechaFinIns ? new Date(rest.fechaFinIns) : master.fechaFinIns,
        fechaIniClase: rest.fechaIniClase ? new Date(rest.fechaIniClase) : master.fechaIniClase,
        estadoInscripcion: rest.estadoInscripcion ?? master.estadoInscripcion,
        estado: rest.estado || master.estado,

        // Relations
        programaId: masterId,
        sedeId: rest.sedeId || null,
        duracionId: rest.duracionId || master.duracionId,
        versionId: rest.versionId, // Must be provided in versionData
        tipoId: rest.tipoId || master.tipoId,
        modalidadId: rest.modalidadId || master.modalidadId,

        createdBy: user?.id || null,

        // Snapshot of modules
        modulos: {
          create: (modulos && modulos.length > 0 ? modulos : master.modulos).map((m: any) => ({
            nombre: m.nombre,
            codigo: m.codigo,
            descripcion: m.descripcion,
            notaMinima: m.notaMinima || 69,
            // Las fechas solo existen en ProgramaModuloDos (Versiones), no en el Maestro
            fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
            fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
            estado: m.estado || 'ACTIVO',
            createdBy: user?.id || null
          }))
        },
        // Setup turns for this offering
        turnos: turnos ? {
          create: turnos.map((t: any) => ({
            turnoIds: t.turnoIds,
            cupo: t.cupo,
            cupoPre: t.cupoPre || 0,
            estado: t.estado || 'ACTIVO',
            createdBy: user?.id || null
          }))
        } : undefined
      },
      include: { modulos: true, turnos: true }
    });

    return version;
  }

  // Inscripciones vinculadas a la versión operativa (ProgramaDos)
  async inscribir(data: any, user: any) {
    let estadoInscripcionId = data.estadoInscripcionId;

    if (!estadoInscripcionId) {
      const defaultState = await this.prisma.programaInscripcionEstado.findFirst({
        where: { nombre: { contains: 'INSCRITO', mode: 'insensitive' } }
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
      }
    });
    return inscripcion;
  }
}
