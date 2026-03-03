import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { BAUCHER_REPOSITORY } from '../../domain/repositories/baucher.repository.interface';
import type { IBaucherRepository } from '../../domain/repositories/baucher.repository.interface';

@Injectable()
export class GetBauchersUseCase {
  constructor(@Inject(BAUCHER_REPOSITORY) private readonly repo: IBaucherRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetBaucherByIdUseCase {
  constructor(@Inject(BAUCHER_REPOSITORY) private readonly repo: IBaucherRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateBaucherUseCase {
  constructor(@Inject(BAUCHER_REPOSITORY) private readonly repo: IBaucherRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateBaucherUseCase {
  constructor(@Inject(BAUCHER_REPOSITORY) private readonly repo: IBaucherRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteBaucherUseCase {
  constructor(@Inject(BAUCHER_REPOSITORY) private readonly repo: IBaucherRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}