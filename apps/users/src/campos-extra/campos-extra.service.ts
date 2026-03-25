import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class CamposExtraService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.mod_campo_extra.findMany({
      where: { estado: 'activo', deletedAt: null },
      orderBy: { orden: 'asc' },
    });
  }

  async create(data: any) {
    if (!data.label || !data.tipo) {
      throw new BadRequestException('Label y Tipo son requeridos');
    }
    return this.prisma.mod_campo_extra.create({
      data: {
        label: data.label,
        tipo: data.tipo,
        esObligatorio: Boolean(data.esObligatorio),
        orden: Number(data.orden) || 0,
        opciones: data.opciones || null,
        estado: 'activo'
      }
    });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.mod_campo_extra.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Campo extra no encontrado');

    return this.prisma.mod_campo_extra.update({
      where: { id },
      data: {
        label: data.label !== undefined ? data.label : undefined,
        tipo: data.tipo !== undefined ? data.tipo : undefined,
        esObligatorio: data.esObligatorio !== undefined ? Boolean(data.esObligatorio) : undefined,
        orden: data.orden !== undefined ? Number(data.orden) : undefined,
        opciones: data.opciones !== undefined ? data.opciones : undefined,
      }
    });
  }

  async delete(id: string) {
    const exists = await this.prisma.mod_campo_extra.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Campo extra no encontrado');

    return this.prisma.mod_campo_extra.update({
      where: { id },
      data: { estado: 'inactivo', deletedAt: new Date() }
    });
  }
}
