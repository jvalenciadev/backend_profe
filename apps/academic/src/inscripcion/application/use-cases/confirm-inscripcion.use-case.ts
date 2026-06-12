import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';

@Injectable()
export class ConfirmInscripcionUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
  ) { }

  async execute(id: string, adminId: string) {
    const inscripcion = await this.repository.findById(id);
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    const bauchers = inscripcion.baucher || [];

    // 1. Check if there are no deposits at all
    if (bauchers.length === 0) {
      throw new BadRequestException(
        'No se puede formalizar: El participante no tiene ningún comprobante de pago registrado. Por favor, agregue y valide un depósito primero.',
      );
    }

    // 2. Check if there are any pending deposits (unconfirmed)
    const tienePendientes = bauchers.some(
      (b: any) => b.confirmado !== true && b.confirmado !== false,
    );
    const tieneRechazados = bauchers.every((b: any) => b.confirmado === false);

    if (tienePendientes) {
      throw new BadRequestException(
        'No se puede formalizar: El participante tiene comprobantes de pago pendientes de verificación. Por favor, valide todos los depósitos en la pestaña "Historial de Pagos" antes de continuar.',
      );
    }

    if (tieneRechazados) {
      throw new BadRequestException(
        'No se puede formalizar: Todos los comprobantes de pago del participante han sido rechazados. Por favor, registre un depósito válido.',
      );
    }

    // 3. Check if total confirmed amount is greater than 0
    const totalConfirmado = bauchers.reduce(
      (s: number, b: any) => s + (b.confirmado ? Number(b.monto) : 0),
      0,
    );
    if (totalConfirmado <= 0) {
      throw new BadRequestException(
        'No se puede formalizar: El participante no cuenta con ningún depósito validado con monto mayor a 0 Bs.',
      );
    }

    // ID for INSCRITO status: 89da2cd1-ac47-41fb-9f48-5850128d78db
    await this.repository.update(id, {
      estadoInscripcionId: '89da2cd1-ac47-41fb-9f48-5850128d78db',
      updatedBy: adminId,
    });

    return { success: true };
  }
}

