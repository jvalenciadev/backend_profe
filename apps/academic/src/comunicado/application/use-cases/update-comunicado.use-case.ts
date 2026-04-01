import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { COMUNICADO_REPOSITORY } from '../../domain/repositories/comunicado.repository.interface';
import type { IComunicadoRepository } from '../../domain/repositories/comunicado.repository.interface';
import { Comunicado } from '../../domain/entities/comunicado.entity';
import { UpdateComunicadoDto } from '../dto/update-comunicado.dto';

@Injectable()
export class UpdateComunicadoUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateComunicadoDto,
    userId?: string,
  ): Promise<Comunicado> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new NotFoundException(`Comunicado con ID ${id} no encontrado`);
      }

      const payload = {
        ...dto,
        updatedBy: userId,
      };

      console.log('Payload a actualizar:', payload);
      return await this.repository.update(id, payload);
    } catch (error) {
      console.error('Error detallado al actualizar comunicado:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al actualizar el comunicado', {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }
}

@Injectable()
export class DeleteComunicadoUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
  ) {}

  async execute(id: string, userId?: string): Promise<boolean> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new NotFoundException(`Comunicado con ID ${id} no encontrado`);
      }
      // Asumiendo que se hace soft-delete o hard-delete
      // Idealmente pasar un userId al repositorio para setear deletedBy y luego hacer .delete
      return await this.repository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al eliminar el comunicado', {
        cause: error,
      });
    }
  }
}
