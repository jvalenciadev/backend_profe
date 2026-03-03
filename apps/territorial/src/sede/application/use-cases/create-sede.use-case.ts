import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SEDE_REPOSITORY } from '../../domain/repositories/sede.repository.interface';
import type { ISedeRepository } from '../../domain/repositories/sede.repository.interface';
import { Sede } from '../../domain/entities/sede.entity';
import { DEPARTAMENTO_REPOSITORY } from '../../../departamento/domain/repositories/departamento.repository.interface';
import type { IDepartamentoRepository } from '../../../departamento/domain/repositories/departamento.repository.interface';

@Injectable()
export class CreateSedeUseCase {
  constructor(
    @Inject(SEDE_REPOSITORY)
    private readonly repository: ISedeRepository,
    @Inject(DEPARTAMENTO_REPOSITORY)
    private readonly departamentoRepository: IDepartamentoRepository,
  ) { }

  async execute(data: any): Promise<Sede> {
    if (data.departamentoId) {
      const depto = await this.departamentoRepository.findById(data.departamentoId);
      if (!depto) {
        throw new BadRequestException(`El departamento con ID ${data.departamentoId} no existe.`);
      }
    } else {
      throw new BadRequestException('La sede debe estar vinculada a un departamento.');
    }

    // Basic business rule validation hook
    return await this.repository.create({ ...data, estado: data.estado || 'activo' });
  }
}
