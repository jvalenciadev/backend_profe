import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PROGRAMAVERSION_REPOSITORY } from '../../domain/repositories/programa-version.repository.interface';
import type { IProgramaVersionRepository } from '../../domain/repositories/programa-version.repository.interface';

@Injectable()
export class GetProgramaVersionsUseCase {
  constructor(
    @Inject(PROGRAMAVERSION_REPOSITORY)
    private readonly repo: IProgramaVersionRepository,
  ) {}
  async execute(filter?: any, ability?: any, user?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability, user);
  }
}

@Injectable()
export class GetProgramaVersionByIdUseCase {
  constructor(
    @Inject(PROGRAMAVERSION_REPOSITORY)
    private readonly repo: IProgramaVersionRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateProgramaVersionUseCase {
  constructor(
    @Inject(PROGRAMAVERSION_REPOSITORY)
    private readonly repo: IProgramaVersionRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateProgramaVersionUseCase {
  constructor(
    @Inject(PROGRAMAVERSION_REPOSITORY)
    private readonly repo: IProgramaVersionRepository,
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
export class DeleteProgramaVersionUseCase {
  constructor(
    @Inject(PROGRAMAVERSION_REPOSITORY)
    private readonly repo: IProgramaVersionRepository,
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
