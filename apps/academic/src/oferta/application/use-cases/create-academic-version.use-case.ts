import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class CreateAcademicVersionUseCase {
    constructor(private readonly prisma: PrismaService) { }

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

        // Snapshot de los datos del maestro + variables de la versión
        const {
            fechaIniIns, fechaInicioInscripcion,
            fechaFinIns, fechaFinInscripcion,
            fechaIniClase, fechaInicioClases,
            nombreAbre, nombreAbreviado,
            estado,
            ...restValues
        } = rest;

        const version = await this.prisma.programaDos.create({
            data: {
                nombre: restValues.nombre || master.nombre,
                nombreAbreviado: nombreAbre || nombreAbreviado || master.nombreAbreviado,
                codigo: restValues.codigo || master.codigo,
                contenido: restValues.contenido || master.contenido,
                horario: restValues.horario || master.horario,
                cargaHoraria: restValues.cargaHoraria || master.cargaHoraria,
                costo: restValues.costo || master.costo,
                banner: restValues.banner || master.banner,
                afiche: restValues.afiche || master.afiche,
                convocatoria: restValues.convocatoria || master.convocatoria,
                fechaInicioInscripcion: (fechaIniIns || fechaInicioInscripcion)
                    ? new Date(fechaIniIns || fechaInicioInscripcion)
                    : master.fechaInicioInscripcion,
                fechaFinInscripcion: (fechaFinIns || fechaFinInscripcion)
                    ? new Date(fechaFinIns || fechaFinInscripcion)
                    : master.fechaFinInscripcion,
                fechaInicioClases: (fechaIniClase || fechaInicioClases)
                    ? new Date(fechaIniClase || fechaInicioClases)
                    : master.fechaInicioClases,
                estadoInscripcion: restValues.estadoInscripcion ?? master.estadoInscripcion,
                estado: (estado || master.estado || 'activo').toLowerCase() as any,

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
                    create: (modulos && modulos.length > 0
                        ? modulos
                        : master.modulos
                    ).map((m: any) => ({
                        nombre: m.nombre,
                        codigo: m.codigo,
                        descripcion: m.descripcion,
                        notaMinima: m.notaMinima || 69,
                        // Las fechas solo existen en ProgramaModuloDos (Versiones), no en el Maestro
                        fechaInicio: m.fechaInicio ? new Date(m.fechaInicio) : new Date(),
                        fechaFin: m.fechaFin ? new Date(m.fechaFin) : new Date(),
                        estado: m.estado || 'activo',
                        createdBy: user?.id || null,
                    })),
                },
                // Setup turns for this offering
                turnos: turnos
                    ? {
                        create: turnos.map((t: any) => ({
                            id: t.id || undefined, // Allow providing fixed IDs if needed
                            turnoIds: t.turnoIds,
                            cupo: t.cupo,
                            cupoPre: t.cupoPre || 0,
                            estado: t.status || t.estado || 'activo',
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
