import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { INSCRIPCION_REPOSITORY } from '../../domain/repositories/inscripcion.repository.interface';
import type { IInscripcionRepository } from '../../domain/repositories/inscripcion.repository.interface';
import * as bcrypt from 'bcryptjs';

export interface BulkImportDto {
  programaId: string;
  turnoId: string;
  sedeId: string;
  participantes: {
    ci: string | number;
    complemento?: string;
    nombres: string;
    apellidos: string;
    correo?: string;
    celular?: string;
    password?: string;
    licenciatura?: string;
    unidadEducativa?: string;
    nivel?: string;
    subsistema?: string;
  }[];
}

@Injectable()
export class BulkImportInscripcionUseCase {
  constructor(
    @Inject(INSCRIPCION_REPOSITORY)
    private readonly repository: IInscripcionRepository,
    private readonly prisma: PrismaService,
  ) { }

  async execute(dto: BulkImportDto, currentUserId?: string) {
    const results = {
      success: 0,
      errors: [] as { ci: string; error: string }[],
    };

    const oferta = await this.prisma.programaDos.findUnique({
      where: { id: dto.programaId },
      select: { departamentoId: true },
    });
    if (!oferta) {
      throw new BadRequestException('La oferta académica no existe');
    }
    const tenantId = oferta.departamentoId;

    const defaultPassword = 'AulaProfe*2026';
    const salt = await bcrypt.genSalt(10);
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, salt);

    // Obtener el ID de estado de inscripción por defecto (Inscrito o Confirmado)
    let estadoDefault = await this.prisma.programa_inscripcion_estado.findFirst({
      where: {
        OR: [
          { nombre: { contains: 'INSCRITO', mode: 'insensitive' } },
        ]
      }
    });

    if (!estadoDefault) {
      estadoDefault = await this.prisma.programa_inscripcion_estado.findFirst();
    }

    const estadoInscripcionId = estadoDefault?.id;
    if (!estadoInscripcionId) {
      throw new BadRequestException('No se encontraron estados de inscripción (programa_inscripcion_estado) en la base de datos.');
    }

    // Pre-fetch the role to avoid connect overhead if possible, 
    // though connect is usually fine, let's keep it simple.

    for (const p of dto.participantes) {
      try {
        const ciStr = String(p.ci).trim();
        if (!ciStr) continue;

        // 1. Ensure User/Persona exists
        let user = await this.prisma.user.findFirst({
          where: { ci: BigInt(ciStr) },
          select: { id: true, licenciatura: true }
        });

        if (!user) {
          // Create new user if not exists
          const customPassword = p.password ? String(p.password).trim() : null;
          const hashedPassword = customPassword
            ? await bcrypt.hash(customPassword, salt)
            : hashedDefaultPassword;

          const email = p.correo ? String(p.correo).trim() : `${ciStr}@aulaprofe.com`;
          const username = ciStr;

          const newUser = await this.prisma.user.create({
            data: {
              ci: BigInt(ciStr),
              complemento: p.complemento ? String(p.complemento).trim() : null,
              nombre: String(p.nombres || '').trim(),
              apellidos: String(p.apellidos || '').trim(),
              correo: email,
              username: username,
              password: hashedPassword,
              celular: p.celular ? String(p.celular).trim() : null,
              licenciatura: p.licenciatura ? String(p.licenciatura).trim() : null,
              estado: 'activo',
              roles: {
                create: {
                  role: {
                    connect: { name: 'PARTICIPANTE' }
                  }
                }
              }
            },
            select: { id: true, licenciatura: true }
          });
          user = newUser;
        }

        // 2. Check existing enrollment
        const existing = await this.repository.findByPersonaAndPrograma(
          user.id,
          dto.programaId,
        );

        if (existing) {
          results.errors.push({
            ci: ciStr,
            error: 'Ya se encuentra inscrito',
          });
          continue;
        }

        // 3. Reserve Cupo (Atomic)
        const reserved = await this.repository.reserveCupo(
          dto.programaId,
          dto.turnoId,
        );

        if (!reserved) {
          results.errors.push({
            ci: ciStr,
            error: 'Sin cupos disponibles',
          });
          continue;
        }

        // 4. Create Enrollment
        await this.repository.create({
          personaId: user.id,
          programaId: dto.programaId,
          turnoId: dto.turnoId,
          sedeId: dto.sedeId,
          tenantId: tenantId,
          createdBy: currentUserId,
          licenciatura: p.licenciatura || user.licenciatura,
          unidadEducativa: p.unidadEducativa,
          estadoInscripcionId: estadoInscripcionId,
        });

        results.success++;
      } catch (error) {
        results.errors.push({
          ci: String(p.ci),
          error: error.message || 'Error',
        });
      }
    }

    return results;
  }
}
