import { Injectable, Inject, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import { OFERTA_REPOSITORY } from '../../../oferta/domain/repositories/oferta.repository.interface';
import type { IOfertaRepository } from '../../../oferta/domain/repositories/oferta.repository.interface';
import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { Inscripcion } from '../../domain/entities/inscripcion.entity';

@Injectable()
export class CreateInscripcionUseCase {
    constructor(
        @Inject(INSCRIPCION_REPOSITORY)
        private readonly repository: IInscripcionRepository,
        @Inject(OFERTA_REPOSITORY)
        private readonly ofertaRepository: IOfertaRepository,
    ) { }

    async execute(dto: CreateInscripcionDto, currentUserId?: string): Promise<Inscripcion> {
        // 1. Check if offering exists
        const oferta = await this.ofertaRepository.findById(dto.programaId);
        if (!oferta) {
            throw new NotFoundException('La oferta académica no existe');
        }

        // 2. Validate enrollment period
        if (!oferta.isEnrollmentOpen()) {
            throw new BadRequestException('El periodo de inscripción para esta oferta ha finalizado o no ha iniciado');
        }

        // 3. Check for duplicate enrollment
        const existing = await this.repository.findByPersonaAndPrograma(dto.personaId, dto.programaId);
        if (existing) {
            throw new ConflictException('La persona ya se encuentra inscrita en este programa');
        }

        // 4. Reserve cupo using atomic transaction
        const reserved = await this.repository.reserveCupo(dto.programaId, dto.turnoId);
        if (!reserved) {
            throw new BadRequestException('No hay cupos disponibles o turno inválido para esta inscripción');
        }

        try {
            // 5. Create enrollment with forced Sede integrity from Offer
            const inscripcion = await this.repository.create({
                ...dto,
                sedeId: oferta.sedeId, // Force Sede from Offer
                createdBy: currentUserId,
                estadoInscripcionId: dto.estadoInscripcionId,
            });
            return inscripcion;
        } catch (error) {
            // If creation fails, we must ideally rollback the `reserveCupo` transaction.
            // A more advanced approach involves a UnitOfWork. But for now, since reserveCupo is atomic,
            // we should technically rollback or use interactive transactions.
            throw new BadRequestException('Error al registrar la inscripción. Intente de nuevo.', { cause: error });
        }
    }
}
