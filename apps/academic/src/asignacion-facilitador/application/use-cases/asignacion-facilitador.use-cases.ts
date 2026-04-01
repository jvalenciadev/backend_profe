import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ASIGNACIONFACILITADOR_REPOSITORY } from '../../domain/repositories/asignacion-facilitador.repository.interface';
import type { IAsignacionFacilitadorRepository } from '../../domain/repositories/asignacion-facilitador.repository.interface';

@Injectable()
export class GetAsignacionFacilitadorsUseCase {
  constructor(
    @Inject(ASIGNACIONFACILITADOR_REPOSITORY)
    private readonly repo: IAsignacionFacilitadorRepository,
  ) {}
  async execute(filter?: any, ability?: any): Promise<any[]> {
    return this.repo.findAll(filter, ability);
  }
}

@Injectable()
export class GetAsignacionFacilitadorByIdUseCase {
  constructor(
    @Inject(ASIGNACIONFACILITADOR_REPOSITORY)
    private readonly repo: IAsignacionFacilitadorRepository,
  ) {}
  async execute(id: string, ability?: any): Promise<any> {
    const res = await this.repo.findById(id, ability);
    if (!res) throw new NotFoundException('Registro no encontrado');
    return res;
  }
}

@Injectable()
export class CreateAsignacionFacilitadorUseCase {
  constructor(
    @Inject(ASIGNACIONFACILITADOR_REPOSITORY)
    private readonly repo: IAsignacionFacilitadorRepository,
  ) {}
  async execute(data: any, userId?: string, tenantId?: string): Promise<any> {
    return this.repo.create(data, userId, tenantId);
  }
}

@Injectable()
export class UpdateAsignacionFacilitadorUseCase {
  constructor(
    @Inject(ASIGNACIONFACILITADOR_REPOSITORY)
    private readonly repo: IAsignacionFacilitadorRepository,
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
export class DeleteAsignacionFacilitadorUseCase {
  constructor(
    @Inject(ASIGNACIONFACILITADOR_REPOSITORY)
    private readonly repo: IAsignacionFacilitadorRepository,
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
