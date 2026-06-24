import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }

  getHello(): string {
    return 'Backend Operativo - PROFE';
  }

  async getDashboardMetrics() {
    // 1. Estadísticas Generales (Personal Activo, Inscritos Totales, Preinscritos, Sedes, Ofertas, Eventos)
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
                  'TECNICO',
                  'GESTOR',
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

    const ofertasAcademicas = await this.prisma.programaDos.count({
      where: { estado: 'activo' },
    });

    const eventosTotales = await this.prisma.evento.count({
      where: { estado: 'activo' },
    });

    // 2. Gráfico de "Estado de Inscripciones"
    const estadosInscripcionGrp = await this.prisma.programaInscripcion.groupBy({
      by: ['estadoInscripcionId'],
      _count: true,
      where: { estado: 'activo' },
    });

    const estadosCatalogo = await this.prisma.programa_inscripcion_estado.findMany();
    const mapEstados = new Map(estadosCatalogo.map((e) => [e.id, e.nombre]));

    const estadosData = estadosInscripcionGrp.map((g) => ({
      name: mapEstados.get(g.estadoInscripcionId) || 'Desconocido',
      valor: g._count,
    }));

    // 3. Inscritos por Programa Académico Reciente
    const topProgramas = await this.prisma.programaDos.findMany({
      where: { estado: 'activo' },
      orderBy: { createdAt: 'desc' },
      take: 6,
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

    // 4. Inscripciones por Historial Mensual (Últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
    seisMesesAtras.setDate(1);
    seisMesesAtras.setHours(0, 0, 0, 0);

    const inscripcionesRecientes = await this.prisma.programaInscripcion.findMany({
      where: {
        estado: 'activo',
        createdAt: { gte: seisMesesAtras },
      },
      select: {
        createdAt: true,
        estadoInscripcion: { select: { nombre: true } },
      },
    });

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesesMap = new Map<string, { mes: string; inscritos: number; egresados: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap.set(key, {
        mes: nombresMeses[d.getMonth()],
        inscritos: 0,
        egresados: 0,
      });
    }

    inscripcionesRecientes.forEach((ins) => {
      const date = new Date(ins.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = mesesMap.get(key);
      if (monthData) {
        const esPre = ins.estadoInscripcion?.nombre?.toUpperCase().includes('PREINSCRITO') ||
          ins.estadoInscripcion?.nombre?.toUpperCase().includes('PENDIENTE');
        if (esPre) {
          monthData.egresados += 1; // Usado como preinscritos/egresados comparador
        } else {
          monthData.inscritos += 1;
        }
      }
    });

    const mensualData = Array.from(mesesMap.values());

    // 5. Inscripciones por Departamento
    const departamentosRaw = await this.prisma.departamento.findMany({
      where: { estado: 'activo' },
      include: {
        sedes: {
          where: { estado: 'activo' },
          select: {
            id: true,
            _count: {
              select: { inscripciones: { where: { estado: 'activo' } } },
            },
          },
        },
      },
    });

    const departamentosData = departamentosRaw.map((dep) => {
      const totalInscritos = dep.sedes.reduce((acc, s) => acc + (s._count?.inscripciones || 0), 0);
      return {
        name: dep.nombre,
        valor: totalInscritos,
      };
    }).filter((d) => d.valor > 0);

    // 6. Actividad Semanal (Usuarios registrados e inscripciones de la semana)
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const dif = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + dif);
    lunes.setHours(0, 0, 0, 0);

    const [inscripcionesSemana, usuariosSemana] = await Promise.all([
      this.prisma.programaInscripcion.findMany({
        where: {
          estado: 'activo',
          createdAt: { gte: lunes },
        },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: {
          estado: 'activo',
          createdAt: { gte: lunes },
        },
        select: { createdAt: true },
      }),
    ]);

    const diasSemanaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const actividadSemanalMap = new Map<number, { dia: string; usuarios: number; eventos: number }>();

    for (let i = 1; i <= 7; i++) {
      const dayNum = i === 7 ? 0 : i;
      actividadSemanalMap.set(dayNum, {
        dia: diasSemanaNombres[dayNum],
        usuarios: 0,
        eventos: 0,
      });
    }

    inscripcionesSemana.forEach((ins) => {
      const dNum = new Date(ins.createdAt).getDay();
      const dayData = actividadSemanalMap.get(dNum);
      if (dayData) dayData.eventos += 1;
    });

    usuariosSemana.forEach((u) => {
      const dNum = new Date(u.createdAt).getDay();
      const dayData = actividadSemanalMap.get(dNum);
      if (dayData) dayData.usuarios += 1;
    });

    const orderedDays = [1, 2, 3, 4, 5, 6, 0];
    const actividadSemanalData = orderedDays.map((dNum) => actividadSemanalMap.get(dNum)!);

    // 7. Actividad Reciente (Últimas inscripciones y registros)
    const [ultimasInscripciones, ultimosUsuarios] = await Promise.all([
      this.prisma.programaInscripcion.findMany({
        where: { estado: 'activo' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          persona: { select: { nombre: true, apellidos: true } },
          programa: { select: { nombre: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { estado: 'activo' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const activityList: any[] = [];

    ultimasInscripciones.forEach((ins) => {
      activityList.push({
        type: 'enrollment',
        label: 'Inscripción Habilitada',
        sub: `${ins.persona ? `${ins.persona.nombre} ${ins.persona.apellidos}` : 'Participante'} inscrito en ${ins.programa?.nombre || 'Programa'}`,
        createdAt: ins.createdAt,
      });
    });

    ultimosUsuarios.forEach((u) => {
      activityList.push({
        type: 'user',
        label: 'Usuario Registrado',
        sub: `${u.nombre} ${u.apellidos} (${u.correo})`,
        createdAt: u.createdAt,
      });
    });

    const actividadReciente = activityList
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((act) => {
        const diffMs = Date.now() - act.createdAt.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMin / 60);
        let timeStr = 'Ahora';
        if (diffMin > 0 && diffMin < 60) {
          timeStr = `${diffMin} min`;
        } else if (diffHrs > 0 && diffHrs < 24) {
          timeStr = `${diffHrs}h`;
        } else if (diffHrs >= 24) {
          timeStr = `${Math.floor(diffHrs / 24)}d`;
        }
        return {
          type: act.type,
          label: act.label,
          sub: act.sub,
          time: timeStr,
        };
      });

    // 8. Logs del día
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [comunicadosHoy, inscripcionesHoy] = await Promise.all([
      this.prisma.comunicado.count({ where: { createdAt: { gte: inicioHoy } } }),
      this.prisma.programaInscripcion.count({ where: { createdAt: { gte: inicioHoy } } }),
    ]);

    // --- NUEVOS DATOS FINANCIEROS ---
    const totalRecaudadoAggregate = await this.prisma.programaBaucher.aggregate({
      where: {
        confirmado: true,
        estado: 'activo',
      },
      _sum: {
        monto: true,
      },
    });
    const totalRecaudado = totalRecaudadoAggregate._sum?.monto || 0;

    const pagosPendientes = await this.prisma.programaBaucher.count({
      where: {
        confirmado: null,
        estado: 'activo',
      },
    });

    const montoPendienteAggregate = await this.prisma.programaBaucher.aggregate({
      where: {
        confirmado: null,
        estado: 'activo',
      },
      _sum: {
        monto: true,
      },
    });
    const montoPendiente = montoPendienteAggregate._sum?.monto || 0;

    const pagosRechazados = await this.prisma.programaBaucher.count({
      where: {
        confirmado: false,
        estado: 'activo',
      },
    });

    // Recaudación mensual (Últimos 6 meses)
    const bauchersMensuales = await this.prisma.programaBaucher.findMany({
      where: {
        confirmado: true,
        estado: 'activo',
        fecha: { gte: seisMesesAtras },
      },
      select: {
        fecha: true,
        monto: true,
      },
    });

    const recaudacionMensualMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      recaudacionMensualMap.set(key, 0);
    }

    bauchersMensuales.forEach((b) => {
      if (b.fecha) {
        const date = new Date(b.fecha);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (recaudacionMensualMap.has(key)) {
          recaudacionMensualMap.set(key, (recaudacionMensualMap.get(key) || 0) + b.monto);
        }
      }
    });

    const nombresMesesCorta = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ingresosMensualesData = Array.from(recaudacionMensualMap.entries()).map(([key, val]) => {
      const [, month] = key.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      return {
        mes: nombresMesesCorta[monthIdx],
        ingresos: val,
      };
    });

    // --- NUEVOS DATOS DE EVENTOS ---
    const totalInscritosEventos = await this.prisma.eventoInscripcion.count({
      where: { estado: 'activo' },
    });

    const asistenciaTotalEventos = await this.prisma.eventoInscripcion.count({
      where: {
        estado: 'activo',
        asistencia: true,
      },
    });

    // Eventos más populares (Top 5)
    const eventosPopularesRaw = await this.prisma.evento.findMany({
      where: { estado: 'activo' },
      include: {
        _count: {
          select: { eventoInscripcions: { where: { estado: 'activo' } } },
        },
      },
      orderBy: {
        eventoInscripcions: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const eventosPopularesData = eventosPopularesRaw.map((e) => ({
      nombre: e.nombre,
      inscritos: e._count.eventoInscripcions,
    }));

    // --- PROGRAMAS POR MODALIDAD ---
    const programasPorModalidadRaw = await this.prisma.programaDos.groupBy({
      by: ['modalidadId'],
      _count: true,
      where: { estado: 'activo' },
    });

    const modalidadesCatalogo = await this.prisma.programaModalidad.findMany();
    const mapModalidades = new Map(modalidadesCatalogo.map((m) => [m.id, m.nombre]));
    const programasPorModalidad = programasPorModalidadRaw.map((g) => ({
      modalidad: mapModalidades.get(g.modalidadId) || 'Desconocido',
      cantidad: g._count,
    })).filter((m) => m.cantidad > 0);

    // --- DISTRIBUCIÓN POR GÉNERO (DEMOGRAFÍA) ---
    const usuariosGeneroRaw = await this.prisma.user.groupBy({
      by: ['genero'],
      _count: true,
      where: { estado: 'activo' },
    });
    const generoData = usuariosGeneroRaw.map((g) => ({
      genero: g.genero || 'Sin especificar',
      cantidad: g._count,
    }));

    // --- CALCULAR REALES KPIS ---
    const totalVouchers = await this.prisma.programaBaucher.count({ where: { estado: 'activo' } });
    const totalConfirmadosVouchers = await this.prisma.programaBaucher.count({
      where: { estado: 'activo', confirmado: true },
    });
    const tasaValidacionPagos = totalVouchers > 0 ? Math.round((totalConfirmadosVouchers / totalVouchers) * 100) : 0;

    const tasaAsistenciaEventos = totalInscritosEventos > 0 ? Math.round((asistenciaTotalEventos / totalInscritosEventos) * 100) : 0;

    const totalInscripciones = await this.prisma.programaInscripcion.count({ where: { estado: 'activo' } });
    const totalConfirmadasInscripciones = await this.prisma.programaInscripcion.count({
      where: {
        estado: 'activo',
        estadoInscripcion: {
          nombre: {
            contains: 'CONFIRMADO',
            mode: 'insensitive',
          },
        },
      },
    });
    const tasaConfirmacionInscritos = totalInscripciones > 0 ? Math.round((totalConfirmadasInscripciones / totalInscripciones) * 100) : 0;

    return {
      stats: {
        personalActivo,
        inscritosTotales,
        preinscritos,
        sedesOperativas,
        ofertasAcademicas,
        eventosTotales,
        totalRecaudado,
        pagosPendientes,
        montoPendiente,
        pagosRechazados,
        totalInscritosEventos,
        asistenciaTotalEventos,
        tasaValidacionPagos,
        tasaAsistenciaEventos,
        tasaConfirmacionInscritos,
      },
      estadosInscripcion: estadosData,
      topProgramas: programasInscritosData,
      mensualData,
      departamentosData,
      actividadSemanal: actividadSemanalData,
      actividadReciente,
      ingresosMensuales: ingresosMensualesData,
      eventosPopulares: eventosPopularesData,
      programasPorModalidad,
      generoData,
      metrics: {
        logsHoy: comunicadosHoy + inscripcionesHoy,
        alertas: pagosPendientes,
      },
    };
  }
}

