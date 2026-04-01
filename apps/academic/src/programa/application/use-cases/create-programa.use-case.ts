import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PROGRAMA_REPOSITORY } from '../../domain/repositories/programa.repository.interface';
import type { IProgramaRepository } from '../../domain/repositories/programa.repository.interface';
import { Programa } from '../../domain/entities/programa.entity';

@Injectable()
export class CreateProgramaUseCase {
  constructor(
    @Inject(PROGRAMA_REPOSITORY)
    private readonly repository: IProgramaRepository,
  ) {}

  async execute(data: any): Promise<Programa> {
    const { fechaInicioInscripcion, fechaFinInscripcion, fechaInicioClases } =
      data;

    if (fechaInicioInscripcion && fechaFinInscripcion) {
      const startInsc = new Date(fechaInicioInscripcion);
      const endInsc = new Date(fechaFinInscripcion);
      if (endInsc <= startInsc) {
        throw new BadRequestException(
          'La fecha de fin de inscripción debe ser posterior a la fecha de inicio.',
        );
      }

      if (fechaInicioClases) {
        const startClasses = new Date(fechaInicioClases);
        if (startClasses < endInsc) {
          throw new BadRequestException(
            'La fecha de inicio de clases no puede ser anterior al fin de inscripciones.',
          );
        }
      }
    }

    // Basic business rule validation hook
    return await this.repository.create({
      ...data,
      estado: data.estado || 'activo',
    });
  }
}
