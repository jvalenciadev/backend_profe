import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

@Injectable()
export class GetInscripcionByIdUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
  ) {}

  async execute(id: string): Promise<Inscripcion> {
    const inscripcion = await this.repository.findById(id);
    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    return inscripcion;
  }
}
