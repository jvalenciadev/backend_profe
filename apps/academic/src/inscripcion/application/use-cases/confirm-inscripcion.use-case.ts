import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';

@Injectable()
export class ConfirmInscripcionUseCase {
    constructor(
        @Inject(INSCRIPCION_REPOSITORY)
        private readonly repository: IInscripcionRepository
    ) { }

    async execute(id: string, adminId: string) {
        const inscripcion = await this.repository.findById(id);
        if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

        // ID for INSCRITO status: 89da2cd1-ac47-41fb-9f48-5850128d78db
        await this.repository.update(id, {
            estadoInscripcionId: '89da2cd1-ac47-41fb-9f48-5850128d78db',
            updatedBy: adminId
        });

        return { success: true };
    }
}
