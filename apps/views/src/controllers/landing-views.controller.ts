import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Param,
  Patch,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { MailService } from '@app/common';
import * as bcrypt from 'bcryptjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { UploadConfigService } from '@app/common';
import { Estado } from '@prisma/client';

/**
 * CONTROLADOR DE VISTAS PÚBLICAS (LANDING PAGE)
 * Requiere API_SECRET (X-SECRET) pero no sesión de usuario.
 */
@Controller('public')
export class LandingViewsController {
  private verificationCodes = new Map<
    string,
    { code: string; expires: number }
  >();

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private readonly uploadConfig: UploadConfigService,
  ) { }

  // ─── LANDING DATA ────────────────────────────────────────────────────────────
  @Get('landing-page')
  async getLandingPageData(@Query('tenant') tenant?: string) {
    let tenantId: string | undefined;
    if (tenant) {
      const dep = await this.prisma.departamento.findFirst({
        where: { abreviacion: tenant.toUpperCase(), estado: Estado.activo },
      });
      if (dep) tenantId = dep.id;
    }

    const [
      profe,
      eventos,
      programasRaw,
      comunicados,
      blogs,
      galerias,
      sedes,
      cargos,
    ] = await Promise.all([
      this.prisma.profe.findFirst({ where: { estado: Estado.activo } }),
      this.prisma.evento.findMany({
        where: {
          estado: { in: [Estado.activo, Estado.finalizado, Estado.vista] },
          ...(tenantId ? { tenantId } : { tenantId: null }),
        },
        take: 12,
        orderBy: { fecha: 'desc' },
        include: {
          tipo: true,
          cuestionarios: { where: { estado: Estado.activo } },
        },
      }),
      this.prisma.programaDos.findMany({
        where: {
          estado: Estado.activo,
          ...(tenantId ? { departamentoId: tenantId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          tipo: true,
          modalidad: true,
          duracion: true,
          sede: { include: { departamento: true } },
          version: true,
          turnos: {
            where: { estado: Estado.activo },
            include: {
              turnoConfig: true,
              _count: {
                select: {
                  inscripciones: {
                    where: {
                      estadoInscripcion: {
                        nombre: {
                          in: ['PREINSCRITO', 'INSCRITO', 'INSCRITOS'],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.comunicado.findMany({
        where: { estado: Estado.activo, ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}) },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blog.findMany({
        where: { estado: Estado.activo, ...(tenantId ? { tenantId } : {}) },
        take: 6,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.galeria.findMany({
        where: {
          estado: Estado.activo,
          ...(tenantId ? { sede: { is: { departamentoId: tenantId } } } : {}),
        },
        take: 12,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sede.findMany({
        where: {
          estado: Estado.activo,
          ...(tenantId ? { departamentoId: tenantId } : {}),
        },
        include: { departamento: true },
        take: 9,
      }),
      this.prisma.cargo.findMany({ where: { estado: Estado.activo } }),
    ]);

    // Grouping: unique per programaId + versionId to avoid duplicates in landing
    const groupedMap = new Map<string, any>();
    programasRaw.forEach((p) => {
      const key = `${p.programaId}-${p.versionId}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, { ...p, hasMultipleSedes: false });
      } else {
        groupedMap.get(key).hasMultipleSedes = true;
      }
    });

    const uniqueProgramas = Array.from(groupedMap.values()).slice(0, 12);

    return {
      profe,
      eventos,
      programas: uniqueProgramas,
      comunicados,
      blogs,
      galerias,
      sedes,
      cargos,
    };
  }

  // ─── PROGRAMA DETAIL ─────────────────────────────────────────────────────────
  @Get('programa/:id')
  async getProgramaById(@Param('id') id: string) {
    const includeBlock: any = {
      tipo: true,
      modalidad: true,
      duracion: true,
      sede: { include: { departamento: true } },
      version: true,
      turnos: {
        where: { estado: Estado.activo },
        include: {
          turnoConfig: true,
          _count: {
            select: {
              inscripciones: {
                where: {
                  estadoInscripcion: {
                    nombre: { in: ['PREINSCRITO', 'INSCRITO', 'INSCRITOS'] },
                  },
                },
              },
            },
          },
        },
      },
      modulos: {
        where: { estado: Estado.activo },
        orderBy: { orden: 'asc' },
      },
    };

    const programa: any = await this.prisma.programaDos.findUnique({
      where: { id },
      include: includeBlock,
    });

    if (!programa) throw new BadRequestException('Programa no encontrado');

    // Buscar todas las sedes del mismo programa (misma versión y nombre), incluyendo la actual
    if (programa.versionId) {
      programa.sedesDisponibles = await this.prisma.programaDos.findMany({
        where: {
          nombre: programa.nombre,
          versionId: programa.versionId,
          estado: Estado.activo,
        },
        include: includeBlock,
        orderBy: { sede: { nombre: 'asc' } },
      });
    }

    return programa;
  }

  // ─── PERSONA LOOKUP (por CI + complemento) ────────────────────────────────────
  @Get('check-persona')
  async checkPersona(
    @Query('ci') ci: string,
    @Query('complemento') complemento?: string,
  ) {
    if (!ci) throw new BadRequestException('CI es requerido');

    const persona = await this.prisma.mapPersona.findFirst({
      where: { ci: ci, complemento: complemento || null, estado: 'activo' },
      include: { genero: true, categoria: true, cargo: true },
    });

    if (!persona) return null;

    return {
      id: persona.id,
      nombre: persona.nombre1,
      nombre2: persona.nombre2,
      apellidoPaterno: persona.apellido1,
      apellidoMaterno: persona.apellido2,
      genero: persona.genero?.nombre,
      celular: persona.celular,
      correo: persona.correo,
    };
  }

  // ─── PERSONA LOOKUP (por CI + complemento + fechaNacimiento) ─────────────────
  @Get('check-persona-by-date')
  async checkPersonaByDate(
    @Query('ci') ci: string,
    @Query('fechaNacimiento') fechaNacimiento: string,
    @Query('complemento') complemento?: string,
    @Query('programaId') programaId?: string,
  ) {
    if (!ci || !fechaNacimiento) {
      throw new BadRequestException('CI y fecha de nacimiento son requeridos');
    }

    const fechaDate = new Date(fechaNacimiento);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha de nacimiento inválida');
    }

    // 1. Buscar en map_persona
    const persona = await this.prisma.mapPersona.findFirst({
      where: {
        ci: ci.trim(),
        ...(complemento
          ? { complemento: complemento.trim() }
          : { complemento: null }),
        estado: 'activo',
      },
    });

    // Validar fecha de nacimiento si se encontró
    let personaMatch = false;
    if (persona) {
      const pFecha = new Date(persona.fechaNacimiento);
      personaMatch =
        pFecha.getFullYear() === fechaDate.getFullYear() &&
        pFecha.getMonth() === fechaDate.getMonth() &&
        pFecha.getDate() === fechaDate.getDate();
    }

    if (persona && personaMatch) {
      // Persona encontrada: buscar o crear en admins
      let user = await this.prisma.user.findFirst({
        where: { personaId: persona.id, estado: 'activo' },
      });

      if (!user) {
        const baseUsername =
          `${persona.ci}${persona.complemento || ''}`.toLowerCase();
        const existing = await this.prisma.user.findFirst({
          where: { username: baseUsername },
        });
        const finalUsername = existing
          ? `${baseUsername}_${Date.now()}`
          : baseUsername;

        user = await this.prisma.user.create({
          data: {
            nombre: persona.nombre1 || 'Sin nombre',
            apellidos:
              `${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim() ||
              'Sin apellido',
            correo: persona.correo || `${finalUsername}@profe.edu.bo`,
            username: finalUsername,
            password: await bcrypt.hash('AulaProfe*2026', 12),
            requiresPasswordChange: true,
            ci: BigInt((persona.ci || '0').replace(/\D/g, '')),
            complemento: persona.complemento || null, // ← per_complemento
            personaId: persona.id,
            fechaNacimiento: persona.fechaNacimiento
              .toISOString()
              .split('T')[0],
            estado: 'activo',
          },
        });
        // Assign the specific Role required: 902c5faa-cd9c-4555-bf78-6f4b1a45896e para PARTICIPANTE
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: '902c5faa-cd9c-4555-bf78-6f4b1a45896e',
            modelType: 'App\\Models\\User',
          },
        });
      }

      return {
        found: true,
        source: 'map_persona',
        userId: user.id,
        nombre: persona.nombre1,
        nombre2: persona.nombre2,
        apellidoPaterno: persona.apellido1,
        apellidoMaterno: persona.apellido2,
        fechaNacimiento: persona.fechaNacimiento,
        celular: persona.celular?.toString(),
        correo: persona.correo || user.correo,
        mod_campos_extra_regs:
          await this.prisma.mod_campo_extra_respuesta.findMany({
            where: { userId: user.id },
            include: { campoExtra: true },
          }),
        alreadyEnrolled: programaId
          ? await this.checkEnrollment(user.id, programaId)
          : null,
      };
    }

    // No encontrado en map_persona (o fecha no coincide) → buscar en admins por CI + complemento
    const ciNum = ci.replace(/\D/g, '');
    let adminUser: any = null;

    if (ciNum) {
      adminUser = await this.prisma.user.findFirst({
        where: {
          ci: BigInt(ciNum),
          complemento: complemento ? complemento.trim() : null,
          estado: 'activo',
        },
      });

      // Si no coincide con complemento, intentar solo por CI
      if (!adminUser) {
        adminUser = await this.prisma.user.findFirst({
          where: { ci: BigInt(ciNum), estado: 'activo' },
        });
      }
    }

    if (adminUser) {
      // Verificar fecha de nacimiento con la que hay en admins
      let fechaMatch = true;
      if (adminUser.fechaNacimiento) {
        const aFecha = new Date(adminUser.fechaNacimiento);
        fechaMatch =
          aFecha.getFullYear() === fechaDate.getFullYear() &&
          aFecha.getMonth() === fechaDate.getMonth() &&
          aFecha.getDate() === fechaDate.getDate();
      }

      if (fechaMatch) {
        return {
          found: true,
          source: 'admins',
          userId: adminUser.id,
          nombre: adminUser.nombre,
          nombre2: null,
          apellidoPaterno: adminUser.apellidos?.split(' ')[0] || null,
          apellidoMaterno:
            adminUser.apellidos?.split(' ').slice(1).join(' ') || null,
          fechaNacimiento: adminUser.fechaNacimiento,
          celular: adminUser.celular,
          correo: adminUser.correo,
          complemento: adminUser.complemento,
          mod_campos_extra_regs:
            await this.prisma.mod_campo_extra_respuesta.findMany({
              where: { userId: adminUser.id },
              include: { campoExtra: true },
            }),
          alreadyEnrolled: programaId
            ? await this.checkEnrollment(adminUser.id, programaId)
            : null,
        };
      }
    }

    // No encontrado en ningún registro → continuar con datos manuales
    return {
      found: false,
      source: null,
      userId: null,
      nombre: null,
      nombre2: null,
      apellidoPaterno: null,
      apellidoMaterno: null,
      fechaNacimiento: fechaNacimiento,
      celular: null,
      correo: null,
      alreadyEnrolled: false,
    };
  }

  private async checkEnrollment(
    userId: string,
    programaId: string,
  ): Promise<any> {
    if (!programaId) return null;
    const prog = await this.prisma.programaDos.findUnique({
      where: { id: programaId },
      select: { programaId: true, versionId: true },
    });
    if (!prog) return null;

    const where: any = {
      personaId: userId,
      estado: 'activo',
    };

    if (prog.programaId && prog.versionId) {
      const hermanos = await this.prisma.programaDos.findMany({
        where: {
          programaId: prog.programaId,
          versionId: prog.versionId,
          estado: { not: Estado.eliminado },
        },
        select: { id: true },
      });
      where.programaId = { in: hermanos.map((h) => h.id) };
    } else {
      where.programaId = programaId;
    }

    const ins = await this.prisma.programaInscripcion.findFirst({
      where,
      include: {
        estadoInscripcion: true,
        persona: {
          include: {
            mod_campos_extra_regs: {
              include: { campoExtra: true },
            },
          },
        },
        programa: {
          include: {
            version: true,
            sede: { include: { departamento: true } },
          },
        },
        turno: { include: { turnoConfig: true } },
        baucher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!ins) return null;

    return {
      ...ins,
      respuestasExtra: ins.persona?.mod_campos_extra_regs || [],
      sede: ins.programa?.sede?.nombre,
      departamento:
        ins.programa?.sede?.departamento?.nombre ||
        (ins.programa?.sede as any)?.dep?.nombre,
      turno: ins.turno?.turnoConfig?.nombre,
      estadoNombre: ins.estadoInscripcion?.nombre,
    };
  }

  @Patch('confirmar-inscripcion/:inscripcionId')
  async confirmarInscripcionPublic(
    @Param('inscripcionId') inscripcionId: string,
  ) {
    const ins = await this.prisma.programaInscripcion.findUnique({
      where: { id: inscripcionId },
    });

    if (!ins) throw new BadRequestException('Inscripción no encontrada');

    // Cambiar a CONFIRMADO (UUID provided by user)
    return this.prisma.programaInscripcion.update({
      where: { id: inscripcionId },
      data: {
        estadoInscripcionId: 'adfbbf09-a486-4b79-8fe0-04cf85d83cae', // CONFIRMADO
      },
      include: {
        estadoInscripcion: true,
      },
    });
  }

  // ─── INSCRIPCION ──────────────────────────────────────────────────────────────
  @Post('inscripcion')
  async registerInscripcion(@Body() body: any) {
    const {
      userId,
      programaId,
      turnoId,
      sedeId,
      baucher,
      datosAdicionales,
      datosPersona,
      mod_campos_extra_regs,
    } = body;

    let user: any;

    if (userId) {
      // Persona encontrada en map_persona → usar user existente
      user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('Usuario no encontrado');
    } else {
      // Persona NO en map_persona → crear con datos manuales (per_id = null)
      if (!datosPersona?.nombre || !datosPersona?.apellidos) {
        throw new BadRequestException(
          'Nombre y apellidos son requeridos para personas sin padrón',
        );
      }

      const ciStr = (datosPersona.ci || '').toString().trim();
      const baseUsername = ciStr
        ? `${ciStr}${datosPersona.complemento || ''}`.toLowerCase()
        : `participante_${Date.now()}`;
      const alreadyExists = await this.prisma.user.findFirst({
        where: { username: baseUsername },
      });
      const finalUsername = alreadyExists
        ? `${baseUsername}_${Date.now()}`
        : baseUsername;

      const correo = datosPersona.correo || `${finalUsername}@profe.edu.bo`;
      const existingEmail = await this.prisma.user.findFirst({
        where: { correo },
      });
      const finalCorreo = existingEmail
        ? `${finalUsername}@profe.edu.bo`
        : correo;

      user = await this.prisma.user.create({
        data: {
          nombre: datosPersona.nombre,
          apellidos: datosPersona.apellidos,
          correo: finalCorreo,
          username: finalUsername,
          password: await bcrypt.hash('AulaProfe*2026', 12),
          requiresPasswordChange: true,
          ci: ciStr ? BigInt(ciStr.replace(/\D/g, '') || 0) : null,
          fechaNacimiento: datosPersona.fechaNacimiento || null,
          personaId: null, // per_id = NULL (no enlazado a map_persona)
          estado: 'activo',
        },
      });

      // Assign the specific Role required: 902c5faa-cd9c-4555-bf78-6f4b1a45896e para PARTICIPANTE
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: '902c5faa-cd9c-4555-bf78-6f4b1a45896e',
          modelType: 'App\\Models\\User',
        },
      });
    }

    // Persistir campos extra si se enviaron
    if (
      mod_campos_extra_regs &&
      Object.keys(mod_campos_extra_regs).length > 0
    ) {
      for (const [campoExtraId, valor] of Object.entries(
        mod_campos_extra_regs,
      )) {
        await this.prisma.mod_campo_extra_respuesta.upsert({
          where: {
            campoExtraId_userId: {
              userId: user.id,
              campoExtraId: campoExtraId,
            },
          },
          update: { valor: String(valor) },
          create: {
            userId: user.id,
            campoExtraId: campoExtraId,
            valor: String(valor),
          },
        });
      }
    }

    // Obtener datos del programa al que se intenta inscribir
    const progHijo = await this.prisma.programaDos.findUnique({
      where: { id: programaId },
      select: { programaId: true, versionId: true },
    });

    // Regla de negocio:
    // — Mismo programa maestro + misma versión → BLOQUEADO (independientemente de la sede)
    // — Mismo programa maestro + versión diferente → PERMITIDO
    if (progHijo?.programaId && progHijo?.versionId) {
      // Obtener todos los ProgramaDos de la misma versión y mismo maestro
      const hermanos = await this.prisma.programaDos.findMany({
        where: {
          programaId: progHijo.programaId,
          versionId: progHijo.versionId,
          estado: { not: 'eliminado' },
        },
        select: { id: true },
      });
      const hermanoIds = hermanos.map((h) => h.id);

      const yaInscrito = await this.prisma.programaInscripcion.findFirst({
        where: {
          personaId: user.id,
          programaId: { in: hermanoIds },
          estado: 'activo',
        },
      });

      if (yaInscrito) {
        throw new BadRequestException(
          'Ya se encuentra inscrito en este programa. No puede inscribirse en otra sede de la misma versión.',
        );
      }
    } else {
      // Sin programa maestro: verificar sólo en el mismo ProgramaDos
      const yaInscrito = await this.prisma.programaInscripcion.findFirst({
        where: { personaId: user.id, programaId, estado: 'activo' },
      });
      if (yaInscrito) {
        throw new BadRequestException(
          'Ya se encuentra inscrito en este programa.',
        );
      }
    }

    const estadoInsc = await this.prisma.programa_inscripcion_estado.findFirst({
      where: { nombre: { contains: 'PENDIENTE', mode: 'insensitive' } },
    });
    let estadoId = estadoInsc?.id;
    if (!estadoId) {
      const fallback =
        await this.prisma.programa_inscripcion_estado.findFirst();
      if (!fallback)
        throw new BadRequestException(
          'No hay estados de inscripción configurados',
        );
      estadoId = fallback.id;
    }

    const inscripcion = await this.prisma.programaInscripcion.create({
      data: {
        programaId,
        turnoId,
        sedeId,
        personaId: user.id, // per_id = admins.id (SIEMPRE no-null)
        estadoInscripcionId: estadoId,
        observacion: 'Inscripción desde plataforma pública',
        unidadEducativa: datosPersona?.unidadEducativa || null,
        nivel: datosPersona?.nivel || null,
        materia: datosPersona?.area || null,
      },
    });

    // Asignar rol PARTICIPANTE al programa inscrito
    const rolePart = await this.prisma.role.findFirst({
      where: { name: { contains: 'PARTICIPANTE', mode: 'insensitive' } },
    });
    const alreadyHasRole = rolePart
      ? await this.prisma.userRole.findFirst({
        where: { userId: user.id, roleId: rolePart.id },
      })
      : null;
    if (rolePart && !alreadyHasRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: rolePart.id,
          modelType: 'App\\Models\\User',
        },
      });
    }

    if (baucher?.imagen && baucher?.nroDeposito) {
      await this.prisma.programaBaucher.create({
        data: {
          inscripcionId: inscripcion.id,
          imagen: baucher.imagen,
          nroDeposito: baucher.nroDeposito
            ? BigInt(String(baucher.nroDeposito).replace(/\D/g, ''))
            : null,
          monto: parseInt(baucher.monto || '0'),
          fecha: new Date(baucher.fecha || new Date()),
          tipoPago: 'Depósito Bancario',
          confirmado: false,
        },
      });
    }

    const progFull = await this.prisma.programaDos.findUnique({
      where: { id: programaId },
      include: { sede: { include: { departamento: true } } },
    });

    // Enviar correo de confirmación (Asíncrono para no bloquear la respuesta)
    this.mailService
      .sendInscripcionConfirmation(
        user.correo,
        `${user.nombre} ${user.apellidos}`,
        progFull?.nombre || 'Programa PROFE',
        progFull?.sede?.nombre || 'Central',
      )
      .catch((err) =>
        console.error('Error enviando correo de inscripción:', err),
      );

    return {
      success: true,
      message: 'Inscripción realizada con éxito',
      inscripcionId: inscripcion.id,
    };
  }

  @Get('campos-extra')
  async getCamposExtra() {
    return this.prisma.mod_campo_extra.findMany({
      where: { estado: 'activo' },
      orderBy: { orden: 'asc' },
    });
  }

  // ─── CATALOGOS ────────────────────────────────────────────────────────────────
  @Get('departamentos')
  async getDepartamentos() {
    return this.prisma.departamento.findMany({
      where: { estado: 'activo' },
      select: { id: true, nombre: true, abreviacion: true },
    });
  }

  @Get('modalidades')
  async getModalidades() {
    return this.prisma.programaModalidad.findMany({
      where: { estado: 'activo' },
      select: { id: true, nombre: true },
    });
  }

  @Get('tipos-evento')
  async getTiposEvento() {
    return this.prisma.tipoEvento.findMany({
      where: { estado: 'activo' },
      select: { id: true, nombre: true },
    });
  }

  // ─── UPLOAD PÚBLICO ──────────────────────────────────────────────────────────
  @Post('upload/baucher')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadPublicFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se ha subido ningún archivo');

    await this.uploadConfig.validateImage('programa_baucher', file);
    const finalPath = await this.uploadConfig.getDynamicPath(
      null,
      'programa_baucher',
    );

    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const filename = `${timestamp}${fileExt}`;
    const fullPath = path.join(finalPath, filename);

    await fs.mkdir(finalPath, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const relativePath = path
      .relative(uploadsRoot, fullPath)
      .replace(/\\/g, '/');
    const fileUrl = `/uploads/${relativePath}`;

    return {
      success: true,
      message: 'Archivo subido correctamente',
      data: {
        filename,
        path: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  // ─── VERIFICACION DE CORREO ───────────────────────────────────────────────
  @Post('send-verification-code')
  async sendVerificationCode(@Body() body: { correo: string; nombre: string }) {
    const { correo, nombre } = body;
    if (!correo) throw new BadRequestException('El correo es obligatorio');

    // Check if user already exists
    const exists = await this.prisma.user.findFirst({ where: { correo } });
    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutos

    this.verificationCodes.set(correo.toLowerCase(), { code, expires });

    // Enviar por correo usando nodemailer
    const sent = await this.mailService.sendVerificationCodeEmail(
      correo,
      code,
      nombre || 'Participante',
    );

    if (!sent) {
      throw new BadRequestException(
        'No se pudo enviar el correo de verificación. Verifique su dirección o intente más tarde.',
      );
    }

    return {
      success: true,
      message: 'Código de verificación enviado al correo',
    };
  }

  @Post('verify-code')
  async verifyCode(@Body() body: { correo: string; code: string }) {
    const { correo, code } = body;
    if (!correo || !code) throw new BadRequestException('Faltan parámetros');

    const record = this.verificationCodes.get(correo.toLowerCase());

    if (!record) {
      throw new BadRequestException(
        'No hay código de verificación pendiente para este correo',
      );
    }

    if (Date.now() > record.expires) {
      this.verificationCodes.delete(correo.toLowerCase());
      throw new BadRequestException('El código de verificación ha expirado');
    }

    if (record.code !== code.trim()) {
      throw new BadRequestException('Código de verificación incorrecto');
    }

    this.verificationCodes.delete(correo.toLowerCase());

    return { success: true, message: 'Correo verificado exitosamente' };
  }

  @Post('reset-password-with-code')
  async resetPasswordWithCode(
    @Body() body: { correo: string; code: string; password: unknown },
  ) {
    const { correo, code, password } = body;
    if (!correo || !code || !password || typeof password !== 'string') {
      throw new BadRequestException(
        'Faltan parámetros o la contraseña es inválida',
      );
    }

    const emailLower = correo.toLowerCase();
    const record = this.verificationCodes.get(emailLower);

    if (!record || record.code !== code.trim() || Date.now() > record.expires) {
      throw new BadRequestException(
        'El código de verificación es inválido o ha expirado',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { correo: emailLower, estado: 'activo' },
    });
    if (!user)
      throw new BadRequestException('Usuario no encontrado o inactivo');

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        requiresPasswordChange: false,
      },
    });

    this.verificationCodes.delete(emailLower);

    return { success: true, message: 'Contraseña restablecida correctamente' };
  }
}
