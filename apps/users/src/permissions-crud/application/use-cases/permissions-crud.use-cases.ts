import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permissions-crud.repository.interface';
import type { IPermissionRepository } from '../../domain/repositories/permissions-crud.repository.interface';

@Injectable()
export class GetPermissionsUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repo: IPermissionRepository) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetPermissionByIdUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repo: IPermissionRepository) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreatePermissionUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repo: IPermissionRepository) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdatePermissionUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repo: IPermissionRepository) {}
  async execute(id: string, data: any, userId?: string, ability?: any): Promise<any> {
    return this.repo.update(id, data, userId, ability);
  }
}

@Injectable()
export class DeletePermissionUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repo: IPermissionRepository) {}
  async execute(id: string, userId?: string, ability?: any): Promise<{ message: string }> {
    await this.repo.delete(id, userId, ability);
    return { message: 'Eliminado correctamente' };
  }
}