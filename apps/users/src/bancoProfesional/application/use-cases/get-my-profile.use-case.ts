import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';

@Injectable()
export class GetMyProfileUseCase {
    constructor(
        @Inject('BANCO_PROFESIONAL_REPOSITORY')
        private readonly repository: IBancoProfesionalRepository
    ) { }

    async execute(userId: string): Promise<BancoProfesional> {
        const profile = await this.repository.findById(userId);
        if (!profile) {
            throw new NotFoundException('Perfil profesional no encontrado');
        }
        return profile;
    }
}
