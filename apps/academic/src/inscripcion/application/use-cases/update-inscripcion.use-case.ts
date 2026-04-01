import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import { OFERTA_REPOSITORY } from '../../../oferta/domain/repositories/oferta.repository.interface';
import type { IOfertaRepository } from '../../../oferta/domain/repositories/oferta.repository.interface';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

@Injectable()
export class UpdateInscripcionUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
    @Inject(OFERTA_REPOSITORY)
    private readonly ofertaRepository: IOfertaRepository,
  ) {}

  async execute(
    id: string,
    data: any,
    currentUserId?: string,
  ): Promise<Inscripcion> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    const updateData: any = { ...data, updatedBy: currentUserId };

    // If program is being changed, validate and sync Sede
    if (data.programaId && data.programaId !== existing.programaId) {
      const oferta = await this.ofertaRepository.findById(data.programaId);
      if (!oferta) {
        throw new NotFoundException('La nueva oferta académica no existe');
      }
      // Update Sede from the new offer to maintain integrity
      updateData.sedeId = oferta.sedeId;

      // Note: In a full implementation, we might also want to transfer/adjust cupos
      // if we are moving the student between offers.
    }

    return this.repository.update(id, updateData);
  }
}
