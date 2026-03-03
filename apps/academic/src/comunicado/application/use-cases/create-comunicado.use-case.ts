import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { COMUNICADO_REPOSITORY } from '../../domain/repositories/comunicado.repository.interface';
import type { IComunicadoRepository } from '../../domain/repositories/comunicado.repository.interface';
import { Comunicado } from '../../domain/entities/comunicado.entity';
import { CreateComunicadoDto } from '../dto/create-comunicado.dto';

@Injectable()
export class CreateComunicadoUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) { }

  async execute(dto: CreateComunicadoDto, userId?: string, tenantId?: string): Promise<Comunicado> {
    try {
      const payload: any = {
        ...dto,
        estado: dto.estado || 'activo',
        createdBy: userId,
      };

      // Si el usuario pertenece a un tenant, lo forzamos al comunicado.
      if (tenantId) {
        payload.tenantId = tenantId;
      }

      console.log('Payload a guardar:', payload);
      return await this.repository.create(payload);
    } catch (error) {
      console.error('Error detallado al crear comunicado:', error);
      throw new BadRequestException('Error al crear el comunicado', {
        cause: error instanceof Error ? error.message : error
      });
    }
  }
}
