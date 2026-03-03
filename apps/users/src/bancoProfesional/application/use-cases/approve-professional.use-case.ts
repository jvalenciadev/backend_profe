import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BANCO_PROFESIONAL_REPOSITORY, type IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';
import { MailService } from '@app/common';

@Injectable()
export class ApproveProfessionalUseCase {
    constructor(
        @Inject(BANCO_PROFESIONAL_REPOSITORY)
        private readonly repository: IBancoProfesionalRepository,
        private readonly mailService: MailService
    ) { }

    async execute(id: string, data: { roleId: string; tenantId?: string; status?: string }, currentUserId: string): Promise<BancoProfesional> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException('Profesional no encontrado');

        const updateData: any = {
            updatedBy: currentUserId,
        };

        if (data.status) updateData.estado = data.status;
        if (data.tenantId) updateData.tenantId = data.tenantId;

        if (data.roleId && data.status?.toLowerCase() !== 'inactivo') {
            updateData.roles = {
                deleteMany: {}, // Remove current roles
                create: [
                    { roleId: data.roleId, modelType: 'App\\User' }
                ]
            };
        }

        const updated = await this.repository.update(id, updateData);

        // Si se cambia el estado a 'inactivo' (baja), enviamos un correo
        const userEmail = (existing as any).correo || (existing as any).user?.correo;
        if (data.status?.toLowerCase() === 'inactivo' && userEmail) {
            const userName = existing.nombre;
            await this.mailService.sendBajaPostulanteEmail(userEmail, userName).catch(err => {
                // Loguear pero no interrumpir el flujo si falla el correo
                console.error('Error enviando correo de baja:', err);
            });
        }

        return updated;
    }
}
