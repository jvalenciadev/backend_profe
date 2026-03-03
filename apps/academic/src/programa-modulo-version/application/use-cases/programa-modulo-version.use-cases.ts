import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PROGRAMAMODULOVERSION_REPOSITORY } from '../../domain/repositories/programa-modulo-version.repository.interface';
import type { IProgramaModuloVersionRepository } from '../../domain/repositories/programa-modulo-version.repository.interface';

@Injectable()
export class GetProgramaModuloVersionsUseCase {
  constructor(@Inject(PROGRAMAMODULOVERSION_REPOSITORY) private readonly repo: IProgramaModuloVersionRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetProgramaModuloVersionByIdUseCase {
  constructor(@Inject(PROGRAMAMODULOVERSION_REPOSITORY) private readonly repo: IProgramaModuloVersionRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateProgramaModuloVersionUseCase {
  constructor(@Inject(PROGRAMAMODULOVERSION_REPOSITORY) private readonly repo: IProgramaModuloVersionRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateProgramaModuloVersionUseCase {
  constructor(@Inject(PROGRAMAMODULOVERSION_REPOSITORY) private readonly repo: IProgramaModuloVersionRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeleteProgramaModuloVersionUseCase {
  constructor(@Inject(PROGRAMAMODULOVERSION_REPOSITORY) private readonly repo: IProgramaModuloVersionRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}