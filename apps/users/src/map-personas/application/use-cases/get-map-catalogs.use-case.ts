import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class GetMapCatalogsUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async getCargos() {
        return this.prisma.mapCargo.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getCategorias() {
        return this.prisma.mapCategoria.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getNiveles() {
        return this.prisma.mapNivel.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getSubsistemas() {
        return this.prisma.mapSubsistema.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getEspecialidades() {
        return this.prisma.mapEspecialidad.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getGeneros() {
        return this.prisma.mapGenero.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getAreas() {
        return this.prisma.mapArea.findMany({
            where: { estado: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    }

    async getStats() {
        const [
            totalPersonas,
            cargoStats,
            especialidadStats,
            categoriaStats,
            generoStats,
            areaStats,
            subsistemaStats,
            nivelStats,
            recientes,
            enFuncionCount,
            noEnFuncionCount, // Nuevo: Personal en reserva
            libretaMilitarCount,
            noLibretaMilitarCount, // Nuevo: Pendiente militar
            conRdaCount,
            sinRdaCount, // Nuevo: Brecha RDA
            correoCount, // Nuevo: Brecha digital
        ] = await Promise.all([
            this.prisma.mapPersona.count(),
            this.prisma.mapPersona.groupBy({
                by: ['carId'],
                _count: { _all: true },
                orderBy: { _count: { carId: 'desc' } },
                take: 20
            }),
            this.prisma.mapPersona.groupBy({
                by: ['espId'],
                _count: { _all: true },
                orderBy: { _count: { espId: 'desc' } },
                take: 20
            }),
            this.prisma.mapPersona.groupBy({
                by: ['catId'],
                _count: { _all: true },
                orderBy: { _count: { catId: 'desc' } }
            }),
            this.prisma.mapPersona.groupBy({
                by: ['genId'],
                _count: { _all: true }
            }),
            this.prisma.mapPersona.groupBy({
                by: ['areaId'],
                _count: { _all: true }
            }),
            this.prisma.mapPersona.groupBy({
                by: ['subId'],
                _count: { _all: true }
            }),
            this.prisma.mapPersona.groupBy({
                by: ['nivId'],
                _count: { _all: true }
            }),
            this.prisma.mapPersona.count({
                where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }
            }),
            this.prisma.mapPersona.count({ where: { enFuncion: true } }),
            this.prisma.mapPersona.count({ where: { enFuncion: false } }),
            this.prisma.mapPersona.count({ where: { libretaMilitar: true } }),
            this.prisma.mapPersona.count({ where: { libretaMilitar: false } }),
            this.prisma.mapPersona.count({ where: { rda: { not: null } } }),
            this.prisma.mapPersona.count({ where: { rda: null } }),
            this.prisma.mapPersona.count({ where: { correo: { not: "" } } }),
        ]);

        const [cargos, especialidades, categorias, generos, areas, subsistemas, niveles] = await Promise.all([
            this.prisma.mapCargo.findMany({ where: { id: { in: cargoStats.map(s => s.carId).filter(Boolean) as string[] } } }),
            this.prisma.mapEspecialidad.findMany({ where: { id: { in: especialidadStats.map(s => s.espId).filter(Boolean) as string[] } } }),
            this.prisma.mapCategoria.findMany({ where: { id: { in: categoriaStats.map(s => s.catId).filter(Boolean) as string[] } } }),
            this.prisma.mapGenero.findMany({ where: { id: { in: generoStats.map(s => s.genId).filter(Boolean) as string[] } } }),
            this.prisma.mapArea.findMany({ where: { id: { in: areaStats.map(s => s.areaId).filter(Boolean) as string[] } } }),
            this.prisma.mapSubsistema.findMany({ where: { id: { in: subsistemaStats.map(s => s.subId).filter(Boolean) as string[] } } }),
            this.prisma.mapNivel.findMany({ where: { id: { in: nivelStats.map(s => s.nivId).filter(Boolean) as string[] } } }),
        ]);

        return {
            total: totalPersonas,
            recientes,
            kpis: {
                operativos: enFuncionCount,
                noOperativos: noEnFuncionCount,
                libretaMilitar: libretaMilitarCount,
                noLibretaMilitar: noLibretaMilitarCount,
                conRda: conRdaCount,
                sinRda: sinRdaCount,
                coberturaCorreo: correoCount,
                digitalizacion: Math.round((correoCount / totalPersonas) * 100)
            },
            cargos: cargoStats.map(s => ({
                name: cargos.find(c => c.id === s.carId)?.nombre || 'SIN CARGO',
                value: s._count._all
            })),
            especialidades: especialidadStats.map(s => ({
                name: especialidades.find(e => e.id === s.espId)?.nombre || 'SIN ESPECIALIDAD',
                value: s._count._all
            })),
            categorias: categoriaStats.map(s => ({
                name: categorias.find(c => c.id === s.catId)?.nombre || 'OTRO',
                value: s._count._all
            })),
            generos: generoStats.map(s => ({
                name: generos.find(g => g.id === s.genId)?.nombre || 'NO DEFINIDO',
                value: s._count._all
            })),
            areas: areaStats.map(s => ({
                name: areas.find(a => a.id === s.areaId)?.nombre || 'ZONA NO DEFINIDA',
                value: s._count._all
            })),
            subsistemas: subsistemaStats.map(s => ({
                name: subsistemas.find(sub => sub.id === s.subId)?.nombre || 'REGULAR',
                value: s._count._all
            })),
            niveles: nivelStats.map(s => ({
                name: niveles.find(n => n.id === s.nivId)?.nombre || 'NIVEL NO DEFINIDO',
                value: s._count._all
            }))
        };
    }
}
