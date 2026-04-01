import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PROFE_REPOSITORY } from '../../domain/repositories/profe.repository.interface';
import type { IProfeRepository } from '../../domain/repositories/profe.repository.interface';
import { Profe } from '../../domain/entities/profe.entity';
import { UpdateProfeDto } from '../dto/update-profe.dto';

@Injectable()
export class UpdateProfeUseCase {
  constructor(
    @Inject(PROFE_REPOSITORY)
    private readonly repository: IProfeRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateProfeDto,
    userId?: string,
  ): Promise<Profe> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new NotFoundException(
          `Configuración institucional con ID ${id} no encontrada`,
        );
      }

      const payload = {
        ...dto,
        updatedBy: userId,
      };

      return await this.repository.update(id, payload);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'Error al actualizar datos institucionales',
        { cause: error },
      );
    }
  }
}

@Injectable()
export class DeleteProfeUseCase {
  constructor(
    @Inject(PROFE_REPOSITORY)
    private readonly repository: IProfeRepository,
  ) {}

  async execute(id: string, userId?: string): Promise<boolean> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new NotFoundException(
          `Configuración institucional con ID ${id} no encontrada`,
        );
      }

      return await this.repository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error al eliminar datos institucionales', {
        cause: error,
      });
    }
  }
}
