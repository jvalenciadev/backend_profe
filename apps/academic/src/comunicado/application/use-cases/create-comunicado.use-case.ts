import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { COMUNICADO_REPOSITORY } from '../../domain/repositories/comunicado.repository.interface';
import type { IComunicadoRepository } from '../../domain/repositories/comunicado.repository.interface';
import { Comunicado } from '../../domain/entities/comunicado.entity';
import { CreateComunicadoDto } from '../dto/create-comunicado.dto';
import { PrismaService } from '@app/database';
import { MailService } from '@app/common';
@Injectable()
export class CreateComunicadoUseCase {
  constructor(
    @Inject(COMUNICADO_REPOSITORY)
    private readonly repository: IComunicadoRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async execute(
    dto: CreateComunicadoDto,
    userId?: string,
    tenantId?: string,
  ): Promise<Comunicado> {
    try {
      const payload: any = {
        ...dto,
        estado: dto.estado || 'activo',
        createdBy: userId,
      };

      // Si el usuario pertenece a un tenant, lo forzamos al comunicado.
      if (tenantId) {
        payload.tenantId = tenantId;
      }

      console.log('Payload a guardar:', payload);
      const created = await this.repository.create(payload);

      // ─── LÓGICA DE ENVÍO DE CORREOS EN SEGUNDO PLANO ───
      // Si el comunicado es ADMINISTRATIVO y es Importante o Urgente, notificar a roles administrativos.
      const tipo = (payload.tipo || '').toUpperCase();
      const importancia = (payload.importancia || '').toUpperCase();

      if (tipo === 'ADMINISTRATIVA' || tipo === 'ADMINISTRATIVO') {
        if (importancia === 'IMPORTANTE' || importancia === 'URGENTE') {
          // Ejecutamos la búsqueda y envío sin hacer await para no bloquear la petición HTTP
          setImmediate(async () => {
            try {
              console.log(
                `[Comunicado-Background] Iniciando envío de correos para comunicado: ${created.nombre}`,
              );

              const rolesToNotify = [
                'beb28e58-0d5a-4edd-83b3-f4f9a1d54d1f', // TECNICOS
                '79efa933-df5f-45f2-992f-47884a95da7e', // ADMINISTRATIVA
                'c8233c1d-cae1-447f-8f3b-a1757da4aa3a', // FACILITADOR
                '29614aad-668b-43dc-8aba-768c802524ad', // RESPONSABLE
              ];

              const users = await this.prisma.user.findMany({
                where: {
                  estado: 'activo',
                  roles: {
                    some: {
                      roleId: { in: rolesToNotify },
                    },
                  },
                  correo: { contains: '@' },
                },
                select: { correo: true },
              });

              // Extraer solo emails únicos
              const emails = Array.from(
                new Set(users.map((u) => u.correo).filter(Boolean)),
              );

              if (emails.length > 0) {
                console.log(
                  `[Comunicado-Background] Se enviarán correos a ${emails.length} usuarios administrativos...`,
                );
                await this.mailService.sendComunicadoEmailChunks(
                  emails,
                  created.nombre,
                  created.descripcion,
                  created.imagen,
                );
              } else {
                console.log(
                  `[Comunicado-Background] No se encontraron usuarios con correo válido para notificar.`,
                );
              }
            } catch (err) {
              console.error(
                `[Comunicado-Background] Error en envío de correos:`,
                err,
              );
            }
          });
        }
      }

      return created;
    } catch (error) {
      console.error('Error detallado al crear comunicado:', error);
      throw new BadRequestException('Error al crear el comunicado', {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }
}
