import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';

@Injectable()
export class DeleteInscripcionUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    await this.repository.delete(id);
  }
}
