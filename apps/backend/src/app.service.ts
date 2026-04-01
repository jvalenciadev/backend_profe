import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Backend Operativo - PROFE';
  }

  async getDashboardMetrics() {
    // 1. Estadísticas Generales (Personal Activo, Inscritos Totales, Preinscritos, Sedes)
    const personalActivo = await this.prisma.user.count({
      where: {
        estado: 'activo',
        roles: {
          some: {
            role: {
              name: {
                in: [
                  'ADMIN',
                  'SUPER_ADMIN',
                  'FACILITADOR',
                  'Técnico',
                  'Gestor',
                  'RESPONSABLE',
                ],
              },
            },
          },
        },
      },
    });

    const inscritosTotales = await this.prisma.programaInscripcion.count({
      where: { estado: 'activo' },
    });

    const preinscritos = await this.prisma.programaInscripcion.count({
      where: {
        estado: 'activo',
        estadoInscripcion: {
          nombre: {
            contains: 'PREINSCRITO',
            mode: 'insensitive',
          },
        },
      },
    });

    const sedesOperativas = await this.prisma.sede.count({
      where: { estado: 'activo' },
    });

    // 2. Gráfico de "Estado de Inscripciones"
    // Agrupamos todos los estadosInscripcion para el pie chart
    const estadosInscripcionGrp = await this.prisma.programaInscripcion.groupBy(
      {
        by: ['estadoInscripcionId'],
        _count: true,
        where: { estado: 'activo' },
      },
    );

    // Obtenemos los nombres de esos estados
    const estadosCatalogo =
      await this.prisma.programa_inscripcion_estado.findMany();
    const mapEstados = new Map(estadosCatalogo.map((e) => [e.id, e.nombre]));

    const estadosData = estadosInscripcionGrp.map((g) => ({
      name: mapEstados.get(g.estadoInscripcionId) || 'Desconocido',
      valor: g._count,
    }));

    // 3. Inscritos por Programa Académico Reciente
    // Buscamos los 5 ProgramasDos más recientes y contamos sus inscritos
    const topProgramas = await this.prisma.programaDos.findMany({
      where: { estado: 'activo' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { inscripciones: { where: { estado: 'activo' } } },
        },
      },
    });

    const programasInscritosData = topProgramas.map((p) => ({
      label: p.nombre,
      count: p._count.inscripciones,
    }));

    // 4. Actividad (Logs de actividad o notificaciones, eventos)
    // Para simplificar, un conteo rápido de comunicados y eventos creados hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const comunicadosHoy = await this.prisma.comunicado.count({
      where: { createdAt: { gte: hoy } },
    });

    const inscripcionesHoy = await this.prisma.programaInscripcion.count({
      where: { createdAt: { gte: hoy } },
    });

    const logsHoy = comunicadosHoy + inscripcionesHoy; // Placeholder para "Logs Hoy"

    return {
      stats: {
        personalActivo,
        inscritosTotales,
        preinscritos,
        sedesOperativas,
      },
      estadosInscripcion: estadosData,
      topProgramas: programasInscritosData,
      metrics: {
        logsHoy,
        alertas: 0,
      },
    };
  }
}
