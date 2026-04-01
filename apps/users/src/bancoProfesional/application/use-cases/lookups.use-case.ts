import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class LookupsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async getTiposPosgrado() {
    const tipos = await this.prisma.bp_tipo_posgrado.findMany({
      where: { btp_estado: { not: 'eliminado' } as any },
      orderBy: { btp_nombre: 'asc' },
    });
    return tipos.map((t) => ({
      id: t.btp_id,
      nombre: t.btp_nombre,
    }));
  }

  async getCategorias() {
    return this.prisma.mapCategoria.findMany({
      where: { estado: { not: 'eliminado' } },
      orderBy: { nombre: 'asc' },
    });
  }

  async getCargos() {
    return this.prisma.cargo.findMany({
      where: { estado: { not: 'eliminado' } },
      orderBy: { nombre: 'asc' },
    });
  }
}
