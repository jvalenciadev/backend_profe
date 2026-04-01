import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';

@Injectable()
export class ManagePosgradoUseCase {
  constructor(
    @Inject('BANCO_PROFESIONAL_REPOSITORY')
    private readonly repository: IBancoProfesionalRepository,
  ) {}

  async add(userId: string, data: any, currentUserId: string): Promise<any> {
    return this.repository.addPosgrado({
      ...data,
      id: userId,
      updatedBy: currentUserId,
    });
  }

  async update(
    posgradoId: string,
    data: any,
    currentUserId: string,
  ): Promise<any> {
    return this.repository.updatePosgrado(posgradoId, {
      ...data,
      updatedBy: currentUserId,
    });
  }

  async delete(posgradoId: string): Promise<void> {
    return this.repository.deletePosgrado(posgradoId);
  }
}

@Injectable()
export class ManageProduccionUseCase {
  constructor(
    @Inject('BANCO_PROFESIONAL_REPOSITORY')
    private readonly repository: IBancoProfesionalRepository,
  ) {}

  async add(userId: string, data: any, currentUserId: string): Promise<any> {
    return this.repository.addProduccion({
      ...data,
      id: userId,
      updatedBy: currentUserId,
    });
  }

  async update(
    produccionId: string,
    data: any,
    currentUserId: string,
  ): Promise<any> {
    return this.repository.updateProduccion(produccionId, {
      ...data,
      updatedBy: currentUserId,
    });
  }

  async delete(produccionId: string): Promise<void> {
    return this.repository.deleteProduccion(produccionId);
  }
}
