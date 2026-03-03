import { Injectable, Inject, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { BANCO_PROFESIONAL_REPOSITORY } from '../../domain/repositories/banco-profesional.repository.interface';
import type { IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';
import { RequestVerificationUseCase } from './request-verification.use-case';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RegistrationUseCase {
    constructor(
        @Inject(BANCO_PROFESIONAL_REPOSITORY)
        private readonly repository: IBancoProfesionalRepository,
        private readonly verificationUseCase: RequestVerificationUseCase,
        private readonly prisma: PrismaService, // Direct use for complex registration transaction
    ) { }

    async execute(data: any): Promise<any> {
        // 1. Validation of code
        const isVerified = this.verificationUseCase.verifyCode(data.correo, data.verificationCode);
        if (!isVerified) {
            throw new BadRequestException('El código de verificación es incorrecto o ha expirado.');
        }

        // 2. Formatting bigints and normalization
        const ci = String(data.ci || '').trim().replace(/\D/g, '');
        const rda = String(data.rda || '').trim().replace(/\D/g, '');

        if (!ci) throw new BadRequestException('El CI es requerido.');
        const ciBigInt = BigInt(ci);
        const rdaBigInt = rda ? BigInt(rda) : null;

        // 3. Conflict Check
        const conflicts = await this.prisma.user.findMany({
            where: {
                OR: [
                    { correo: data.correo },
                    { username: data.username },
                    { ci: ciBigInt },
                ],
            },
        });

        // Verificamos si hay un conflicto activo (que no sea inactivo o eliminado)
        const activeConflict = conflicts.find(c => c.estado !== 'inactivo' && c.estado !== 'eliminado');
        if (activeConflict) {
            if (activeConflict.correo === data.correo) throw new ConflictException('Este correo ya está registrado en una cuenta activa.');
            if (activeConflict.username === data.username) throw new ConflictException('Este nombre de usuario ya está ocupado.');
            if (activeConflict.ci === ciBigInt) throw new ConflictException('Este número de CI ya está registrado en una cuenta activa.');
        }

        // 4. Role Assignment preparation
        let role = await this.prisma.role.findFirst({
            where: { name: 'POSTULACION_PROFE' },
        });
        if (!role) {
            role = await this.prisma.role.create({
                data: { name: 'POSTULACION_PROFE', guardName: 'api' },
            });
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        // 5. Transaction
        return this.prisma.$transaction(async (tx) => {
            const inactiveConflict = conflicts.find(c => c.estado === 'inactivo');

            let user;

            if (inactiveConflict) {
                // Si existe un inactivo, lo re-activamos y actualizamos
                user = await tx.user.update({
                    where: { id: inactiveConflict.id },
                    data: {
                        correo: data.correo,
                        username: data.username,
                        password: hashedPassword,
                        nombre: String(data.nombre).toUpperCase(),
                        apellidos: String(data.apellidos).toUpperCase(),
                        ci: ciBigInt,
                        rda: rdaBigInt,
                        cargoPostulacionId: data.cargoId,
                        tenantId: data.tenantId || null,
                        roles: {
                            deleteMany: {},
                            create: [{ roleId: role.id, modelType: 'App\\User' }]
                        },
                        imagen: data.imagen || null,
                        estado: 'pendiente' // Restablecemos el estado
                    }
                });
            } else {
                // Registro normal desde cero
                user = await tx.user.create({
                    data: {
                        correo: data.correo,
                        username: data.username,
                        password: hashedPassword,
                        nombre: String(data.nombre).toUpperCase(),
                        apellidos: String(data.apellidos).toUpperCase(),
                        ci: ciBigInt,
                        rda: rdaBigInt,
                        cargoPostulacionId: data.cargoId,
                        tenantId: data.tenantId || null,
                        roles: { create: [{ roleId: role.id, modelType: 'App\\User' }] },
                        imagen: data.imagen || null,
                        estado: 'pendiente',
                    }
                });
            }

            // Serialización simplificada para el registro
            return {
                id: user.id,
                username: user.username,
                correo: user.correo
            };
        });
    }
}
