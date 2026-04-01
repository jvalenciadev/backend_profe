import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { type IBancoProfesionalRepository } from '../../domain/repositories/banco-profesional.repository.interface';
import { BancoProfesional } from '../../domain/entities/banco-profesional.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject('BANCO_PROFESIONAL_REPOSITORY')
    private readonly repository: IBancoProfesionalRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateProfileDto,
    currentUserId: string,
  ): Promise<BancoProfesional> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing)
        throw new NotFoundException('Ficha profesional no encontrada');

      const updateData: any = { updatedBy: currentUserId };

      // Mapping frontend fields to Prisma fields
      if (dto.nombre) updateData.nombre = dto.nombre;
      if (dto.apellidos) updateData.apellidos = dto.apellidos;
      if (dto.fechaNac) updateData.fechaNacimiento = dto.fechaNac;
      if (dto.ci !== undefined) updateData.ci = BigInt(dto.ci);
      if (dto.rda !== undefined) updateData.rda = BigInt(dto.rda);
      if (dto.celular !== undefined) updateData.celular = dto.celular || null;
      if (dto.genero) updateData.genero = dto.genero;

      const allowedFields = [
        'esMaestro',
        'licUniversitaria',
        'licMescp',
        'tieneProduccion',
        'hojaDeVidaPdf',
        'estado',
        'resumenProfesional',
        'habilidades',
        'idiomas',
        'experienciaLaboral',
        'linkedinUrl',
        'direccion',
        'estadoCivil',
        'imagen',
        'rdaPdf',
      ];

      allowedFields.forEach((f) => {
        if ((dto as any)[f] !== undefined) {
          if (f === 'esMaestro' || f === 'tieneProduccion') {
            updateData[f] =
              (dto as any)[f] === true || (dto as any)[f] === 'true';
          } else {
            updateData[f] = (dto as any)[f];
          }
        }
      });

      if (dto.cargoId !== undefined) {
        const cargoId = String(dto.cargoId).trim();
        updateData.cargoPostulacionId =
          cargoId && cargoId !== 'null' ? cargoId : null;
      }

      return await this.repository.update(id, updateData);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'Error al actualizar el expediente profesional',
        { cause: error },
      );
    }
  }
}
