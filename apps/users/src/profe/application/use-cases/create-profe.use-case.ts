import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PROFE_REPOSITORY } from '../../domain/repositories/profe.repository.interface';
import type { IProfeRepository } from '../../domain/repositories/profe.repository.interface';
import { Profe } from '../../domain/entities/profe.entity';
import { CreateProfeDto } from '../dto/create-profe.dto';

@Injectable()
export class CreateProfeUseCase {
  constructor(
    @Inject(PROFE_REPOSITORY)
    private readonly repository: IProfeRepository,
  ) {}

  async execute(dto: CreateProfeDto, userId?: string): Promise<Profe> {
    try {
      // 1. Validar que solo exista un registro institucional activo si el negocio lo requiere.
      // (Asumiendo que puede haber varios para historicos o sedes, o solo uno activo)
      const existing = await this.repository.findAll({ estado: 'activo' });
      if (existing.data && existing.data.length > 0) {
        // Podríamos lanzar un error o simplemente permitirlo si es multi-institución
        // throw new ConflictException('Ya existe una configuración institucional activa.');
      }

      /* Usaremos fallback de campos en caso que frontend no envíe, esto es común
         para el modelo "profe" que tiene muchos campos como "imagen", etc y prisma demanda no nulos */
      const payload: any = {
        ...dto,
        imagen: dto.imagen || 'default.png',
        fechaCreacion: new Date(),
        estado: dto.estado || 'activo',
        createdBy: userId,
      };

      return await this.repository.create(payload);
    } catch (error) {
      throw new BadRequestException(
        'Error al crear los datos institucionales',
        { cause: error },
      );
    }
  }
}
