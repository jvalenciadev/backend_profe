import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { Public } from '@app/common';

// ─── SERVICE ────────────────────────────────────────────────────────────────

@Injectable()
export class ProfeService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener el registro único de Profe.
     * Devuelve null si aún no fue creado.
     */
    async get() {
        try {
            console.log('Fetching Profe configuration...');
            const config = await this.prisma.profe.findFirst({
                where: { estado: { not: 'eliminado' } },
            });
            console.log('Profe config found:', !!config);
            return config;
        } catch (error) {
            console.error('CRITICAL ERROR in ProfeService.get():', error);
            throw error;
        }
    }

    /**
     * Crear el registro de Profe.
     * Solo se permite si NO existe ninguno todavía.
     */
    async create(data: any) {
        const existing = await this.prisma.profe.findFirst({
            where: { estado: { not: 'eliminado' } },
        });
        if (existing) {
            throw new BadRequestException(
                'Ya existe un registro de la institución. Use PATCH para editarlo.',
            );
        }
        return this.prisma.profe.create({ data });
    }

    /**
     * Editar el registro existente de Profe.
     * No se puede eliminar.
     */
    async update(id: string, data: any) {
        const existing = await this.prisma.profe.findFirst({
            where: { id, estado: { not: 'eliminado' } },
        });
        if (!existing) {
            throw new NotFoundException('Registro de la institución no encontrado.');
        }
        // Evitar que se cambie el estado a ELIMINADO desde este endpoint
        delete data.estado;
        delete data.deletedAt;
        delete data.deletedBy;

        return this.prisma.profe.update({
            where: { id },
            data,
        });
    }
}

// ─── CONTROLLER ─────────────────────────────────────────────────────────────

@Public()
@Controller('profe')
export class ProfeController {
    constructor(private readonly profeService: ProfeService) { }

    /**
     * GET /profe
     * Obtiene la información institucional.
     */
    @Get()
    async get() {
        return this.profeService.get();
    }

    /**
     * POST /profe
     * Crea el registro institucional (solo una vez).
     */
    @Post()
    async create(@Body() body: any) {
        return this.profeService.create(body);
    }

    /**
     * PATCH /profe/:id
     * Edita el registro institucional existente.
     */
    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.profeService.update(id, body);
    }
}
