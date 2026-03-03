import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PROVINCIA_REPOSITORY } from '../../domain/repositories/provincia.repository.interface';
import type { IProvinciaRepository } from '../../domain/repositories/provincia.repository.interface';

@Injectable()
export class GetProvinciasUseCase {
  constructor(@Inject(PROVINCIA_REPOSITORY) private readonly repo: IProvinciaRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetProvinciaByIdUseCase {
  constructor(@Inject(PROVINCIA_REPOSITORY) private readonly repo: IProvinciaRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateProvinciaUseCase {
  constructor(@Inject(PROVINCIA_REPOSITORY) private readonly repo: IProvinciaRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateProvinciaUseCase {
  constructor(@Inject(PROVINCIA_REPOSITORY) private readonly repo: IProvinciaRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteProvinciaUseCase {
  constructor(@Inject(PROVINCIA_REPOSITORY) private readonly repo: IProvinciaRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}