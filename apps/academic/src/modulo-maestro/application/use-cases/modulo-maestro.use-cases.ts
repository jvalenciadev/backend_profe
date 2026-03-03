import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { MODULOMAESTRO_REPOSITORY } from '../../domain/repositories/modulo-maestro.repository.interface';
import type { IModuloMaestroRepository } from '../../domain/repositories/modulo-maestro.repository.interface';

@Injectable()
export class GetModuloMaestrosUseCase {
  constructor(@Inject(MODULOMAESTRO_REPOSITORY) private readonly repo: IModuloMaestroRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetModuloMaestroByIdUseCase {
  constructor(@Inject(MODULOMAESTRO_REPOSITORY) private readonly repo: IModuloMaestroRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateModuloMaestroUseCase {
  constructor(@Inject(MODULOMAESTRO_REPOSITORY) private readonly repo: IModuloMaestroRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateModuloMaestroUseCase {
  constructor(@Inject(MODULOMAESTRO_REPOSITORY) private readonly repo: IModuloMaestroRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteModuloMaestroUseCase {
  constructor(@Inject(MODULOMAESTRO_REPOSITORY) private readonly repo: IModuloMaestroRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}