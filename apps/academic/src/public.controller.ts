import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { Public } from '@app/common';

@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) { }

  @Get('landing-page')
  async getLandingPageData(@Query('tenant') tenant?: string) {
    let tenantId: string | undefined;

    if (tenant) {
      const dep = await this.prisma.departamento.findFirst({
        where: { abreviacion: tenant.toUpperCase(), estado: 'activo' },
      });
      if (dep) tenantId = dep.id;
    }

    const [
      profe,
      eventos,
      programas,
      comunicados,
      blogs,
      galerias,
      sedes,
      cargos,
    ] = await Promise.all([
      this.prisma.profe.findFirst({ where: { estado: 'activo' } }),
      this.prisma.evento.findMany({
        where: { estado: 'activo', ...(tenantId ? { tenantId } : {}) },
        take: 12,
        orderBy: { fecha: 'desc' },
        include: { tipo: true, cuestionarios: { where: { estado: 'activo' } } },
      }),
      this.prisma.programaDos.findMany({
        where: {
          estado: 'activo',
          ...(tenantId ? { departamentoId: tenantId } : {}),
        },
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: { tipo: true, modalidad: true, duracion: true },
      }),
      this.prisma.comunicado.findMany({
        where: { estado: 'activo', ...(tenantId ? { tenantId } : {}) },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blog.findMany({
        where: { estado: 'activo', ...(tenantId ? { tenantId } : {}) },
        take: 6,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.galeria.findMany({
        where: {
          estado: 'activo',
          ...(tenantId ? { sede: { is: { departamentoId: tenantId } } } : {}),
        },
        take: 12,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sede.findMany({
        where: {
          estado: 'activo',
          ...(tenantId ? { departamentoId: tenantId } : {}),
        },
        take: 9,
      }),
      this.prisma.cargo.findMany({
        where: { estado: 'activo' },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      profe,
      eventos,
      programas,
      comunicados,
      blogs,
      galerias,
      sedes,
      cargos,
    };
  }

  @Get('departamentos')
  async getDepartamentos() {
    return this.prisma.departamento.findMany({
      where: { estado: 'activo' },
      select: { id: true, nombre: true, abreviacion: true },
    });
  }

  @Get('modalidades')
  async getModalidades() {
    return this.prisma.programaModalidad.findMany({
      where: { estado: 'activo' },
      select: { id: true, nombre: true },
    });
  }
}
