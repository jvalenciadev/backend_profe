import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { VERSION_REPOSITORY } from '../../domain/repositories/version.repository.interface';
import type { IVersionRepository } from '../../domain/repositories/version.repository.interface';

@Injectable()
export class GetVersionsUseCase {
  constructor(
    @Inject(VERSION_REPOSITORY) private readonly repo: IVersionRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetVersionByIdUseCase {
  constructor(
    @Inject(VERSION_REPOSITORY) private readonly repo: IVersionRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateVersionUseCase {
  constructor(
    @Inject(VERSION_REPOSITORY) private readonly repo: IVersionRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateVersionUseCase {
  constructor(
    @Inject(VERSION_REPOSITORY) private readonly repo: IVersionRepository,
  ) {}
  async execute(
    id: string,
    data: any,
    userId?: string,
    ability?: any,
  ): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteVersionUseCase {
  constructor(
    @Inject(VERSION_REPOSITORY) private readonly repo: IVersionRepository,
  ) {}
  async execute(
    id: string,
    userId?: string,
    ability?: any,
  ): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}
