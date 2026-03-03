import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GALERIA_REPOSITORY } from '../../domain/repositories/galeria.repository.interface';
import type { IGaleriaRepository } from '../../domain/repositories/galeria.repository.interface';

@Injectable()
export class GetGaleriasUseCase {
  constructor(@Inject(GALERIA_REPOSITORY) private readonly repo: IGaleriaRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetGaleriaByIdUseCase {
  constructor(@Inject(GALERIA_REPOSITORY) private readonly repo: IGaleriaRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateGaleriaUseCase {
  constructor(@Inject(GALERIA_REPOSITORY) private readonly repo: IGaleriaRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateGaleriaUseCase {
  constructor(@Inject(GALERIA_REPOSITORY) private readonly repo: IGaleriaRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteGaleriaUseCase {
  constructor(@Inject(GALERIA_REPOSITORY) private readonly repo: IGaleriaRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}