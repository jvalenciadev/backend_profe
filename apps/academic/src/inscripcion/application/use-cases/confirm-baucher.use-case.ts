import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';

@Injectable()
export class ConfirmBaucherUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
  ) {}

  async execute(baucherId: string, confirmed: boolean, adminId: string) {
    const baucher = await this.repository.findBaucherById(baucherId);
    if (!baucher) throw new NotFoundException('Baucher no encontrado');

    await this.repository.updateBaucher(baucherId, {
      confirmado: confirmed,
      fechaConfirmacion: confirmed ? new Date() : null,
      updatedBy: adminId,
    });

    return { success: true };
  }
}
