import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as bcrypt from 'bcryptjs';
import { Estado } from '@prisma/client';

import { MailService } from '@app/common';
import * as crypto from 'crypto';

@Injectable()
export class BancoProfesionalService {
  private verificationCodes = new Map<
    string,
    { code: string; expires: Date }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  // ─── REGISTRO INICIAL (crea User en admins + ficha BancoProfesional) ─────────
  async requestVerification(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 minutos exactos

    this.verificationCodes.set(normalizedEmail, { code, expires });

    await this.mailService.sendPasswordResetEmail(normalizedEmail, code, 'Postulante');
    return { message: 'Código enviado' };
  }

  async registrar(data: any) {
    console.log('Senior Registrar Request received');

    // 1. Normalización y Limpieza de Datos
    const ciRaw = String(data.ci || data.per_ci || data.bp_ci || '').trim();
    const rdaRaw = String(data.rda || '').trim();
    const cargoIdValue = (data.cargoId || data.car_id || '').trim();
    const tenantIdValue =
      data.tenantId && String(data.tenantId).trim() !== ''
        ? String(data.tenantId).trim()
        : null;

    // 2. Validaciones Críticas
    if (!ciRaw)
      throw new BadRequestException(
        'El número de Cédula de Identidad (CI) es requerido.',
      );
    if (!cargoIdValue)
      throw new BadRequestException(
        'Debe seleccionar un cargo al que postula.',
      );
    if (!data.correo)
      throw new BadRequestException('El correo electrónico es requerido.');
    if (!data.username)
      throw new BadRequestException('El nombre de usuario es requerido.');
    if (!data.password)
      throw new BadRequestException('La contraseña es requerida.');

    // Validación de código de verificación
    const normalizedEmail = String(data.correo).trim().toLowerCase();
    const verification = this.verificationCodes.get(normalizedEmail);
    if (
      !verification ||
      String(verification.code) !== String(data.verificationCode).trim() ||
      verification.expires < new Date()
    ) {
      throw new BadRequestException(
        'El código de verificación es incorrecto o ha expirado. Asegúrese de usar el último código enviado.',
      );
    }

    // 3. Conversión Segura a BigInt
    let ciBigInt: bigint;
    try {
      ciBigInt = BigInt(ciRaw.replace(/\D/g, ''));
    } catch (e) {
      throw new BadRequestException(
        'El formato del CI no es válido (solo números).',
      );
    }

    let rdaBigInt: bigint | null = null;
    if (rdaRaw) {
      try {
        rdaBigInt = BigInt(rdaRaw.replace(/\D/g, ''));
      } catch (e) {
        throw new BadRequestException(
          'El formato del RDA no es válido (solo números).',
        );
      }
    }

    // 4. Verificaciones de Existencia (Evitar duplicados)
    const conflict = await this.prisma.user.findFirst({
      where: {
        OR: [
          { correo: data.correo },
          { username: data.username },
          { ci: ciBigInt },
        ],
      },
    });

    if (conflict) {
      if (conflict.correo === data.correo)
        throw new ConflictException('Este correo ya está registrado.');
      if (conflict.username === data.username)
        throw new ConflictException('Este nombre de usuario ya está ocupado.');
      if (conflict.ci === ciBigInt)
        throw new ConflictException('Este número de CI ya está registrado.');
    }

    // 5. Verificación de Cargo
    const cargo = await this.prisma.cargo.findFirst({
      where: { id: cargoIdValue },
    });
    if (!cargo)
      throw new NotFoundException(
        'El cargo seleccionado no es válido o no existe.',
      );

    // 6. Preparación de Seguridad (Rol)
    let role = await this.prisma.role.findFirst({
      where: { name: 'POSTULACION_PROFE' },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'POSTULACION_PROFE', guardName: 'api' },
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // 7. Transacción Atómica de Registro
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            correo: data.correo,
            username: data.username,
            password: hashedPassword,
            nombre: String(data.nombre).toUpperCase(),
            apellidos: String(data.apellidos).toUpperCase(),
            fechaNacimiento: data.fechaNac || null,
            ci: ciBigInt,
            rda: rdaBigInt,
            rdaPdf: data.rdaPdf || null,
            categoriaId: data.categoriaId || null,
            tenantId: tenantIdValue,
            celular: data.celular || null,
            genero: data.genero || null,
            direccion: data.direccion || null,
            estadoCivil: data.estadoCivil || null,
            roles: { create: [{ roleId: role.id, modelType: 'App\\User' }] },
            esMaestro: data.esMaestro === true || data.esMaestro === 'true',
            licUniversitaria: data.licUniversitaria || null,
            licMescp: data.licMescp || null,
            tieneProduccion:
              data.tieneProduccion === true || data.tieneProduccion === 'true',
            cargoPostulacionId: cargoIdValue,
            imagen: data.imagen || null,
            estado: data.estado || 'pendiente',
            idiomas: data.idiomas || null,
            experienciaLaboral: data.experienciaLaboral || null,
            habilidades: data.habilidades || null,
            resumenProfesional: data.resumenProfesional || null,
            linkedinUrl: data.linkedinUrl || null,
          },
          include: {
            cargoPostulacion: true,
          },
        });

        return {
          user: { id: user.id, correo: user.correo, username: user.username },
          ficha: this.serializeFicha(user),
        };
      });

      this.verificationCodes.delete(normalizedEmail);
      return result;
    } catch (error) {
      console.error('CRITICAL: Error in Registration Transaction:', error);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'No se pudo completar el registro. ' + (error.message || 'Verifique que todos los datos sean correctos.'),
      );
    }
  }

  async getMiFicha(userId: string) {
    const ficha = await this.prisma.user.findFirst({
      where: { id: userId, estado: { not: 'eliminado' } },
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
    });
    if (!ficha) return null;
    return this.serializeFicha(ficha);
  }

  async findAll(filter: { cargoId?: string; estado?: string } = {}) {
    const where: any = {
      estado: { not: 'eliminado' },
      cargoPostulacionId: { not: null },
    };
    if (filter.cargoId) where.cargoPostulacionId = filter.cargoId;
    if (filter.estado) where.estado = filter.estado;

    const fichas = await this.prisma.user.findMany({
      where,
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return fichas.map((f) => this.serializeFicha(f));
  }

  async findOne(id: string) {
    const ficha = await this.prisma.user.findFirst({
      where: { id, estado: { not: 'eliminado' } },
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
    });
    if (!ficha) throw new NotFoundException('Ficha no encontrada');
    return this.serializeFicha(ficha);
  }

  async update(id: string, data: any, currentUserId: string) {
    try {
      const ficha = await this.prisma.user.findFirst({ where: { id } });
      if (!ficha) throw new NotFoundException('Ficha no encontrada');

      const updateData: any = { updatedBy: currentUserId };
      if (data.nombre) updateData.nombre = data.nombre;
      if (data.apellidos) updateData.apellidos = data.apellidos;
      if (data.fechaNac) updateData.fechaNacimiento = data.fechaNac;
      if (data.ci) updateData.ci = BigInt(data.ci);
      if (data.rda) updateData.rda = BigInt(data.rda);

      if (data.correo && data.correo !== ficha.correo) {
        const normalizedEmail = String(data.correo).trim().toLowerCase();
        const verification = this.verificationCodes.get(normalizedEmail);
        if (
          !verification ||
          String(verification.code) !== String(data.verificationCode).trim() ||
          verification.expires < new Date()
        ) {
          throw new BadRequestException(
            'El código de verificación para el nuevo correo es incorrecto o ha expirado.',
          );
        }
        this.verificationCodes.delete(normalizedEmail);
        updateData.correo = data.correo;
      }
      if (data.celular !== undefined) updateData.celular = data.celular || null;
      if (data.genero) updateData.genero = data.genero;

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
        'rdaPdf'
      ];

      allowedFields.forEach((f) => {
        if (data[f] !== undefined) {
          if (f === 'esMaestro' || f === 'tieneProduccion') {
            updateData[f] = data[f] === true || data[f] === 'true';
          } else {
            updateData[f] = data[f];
          }
        }
      });

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 12);
      }

      if (data.cargoId !== undefined) {
        const cargoId = String(data.cargoId).trim();
        updateData.cargoPostulacionId =
          cargoId && cargoId !== 'null' ? cargoId : null;
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          cargoPostulacion: true,
          bp_posgrado: { include: { bp_tipo_posgrado: true } },
          bp_produccion_intelectual: true,
        },
      });

      return this.serializeFicha(updated);
    } catch (error) {
      console.error('Error updating ficha:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'Error al actualizar la ficha: ' + error.message,
      );
    }
  }

  async remove(id: string, currentUserId: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        estado: 'eliminado',
        deletedAt: new Date(),
        deletedBy: currentUserId,
      },
    });
  }

  async aprobar(
    id: string,
    data: { roleId: string; tenantId?: string; status?: string },
    currentUserId: string,
  ) {
    const targetStatus = (data.status || 'activo').toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return await this.prisma.$transaction(async (tx) => {
      const tenantId =
        data.tenantId && data.tenantId.trim() !== ''
          ? data.tenantId
          : user.tenantId;

      await tx.user.update({
        where: { id },
        data: {
          estado: targetStatus as any,
          tenantId: tenantId,
          updatedBy: currentUserId,
        },
      });

      const hasRole = user.roles.some((r) => r.roleId === data.roleId);
      if (!hasRole) {
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        await tx.userRole.create({
          data: {
            userId: id,
            roleId: data.roleId,
            modelType: 'App\\User',
          },
        });
      }

      return { message: 'Profesional aprobado y rol asignado correctamente' };
    });
  }

  // ─── POSTGRADOS CRUD ──────────────────────────────────────────────────────────
  async addPosgrado(
    userId: string,
    data: {
      tipoPosgradoId: string;
      titulo: string;
      fecha: string;
      imagen?: string;
    },
    currentUserId: string,
  ) {
    if (!userId)
      throw new BadRequestException('El ID de usuario es requerido.');
    if (!data.tipoPosgradoId)
      throw new BadRequestException('El tipo de postgrado es requerido.');
    if (!data.titulo) throw new BadRequestException('El título es requerido.');

    let posgradoDate = new Date();
    if (data.fecha) {
      const parsedDate = new Date(data.fecha);
      if (!isNaN(parsedDate.getTime())) {
        posgradoDate = parsedDate;
      }
    }

    let tipoId = data.tipoPosgradoId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tipoId);

    if (!isUuid) {
      const found = await this.prisma.bp_tipo_posgrado.findFirst({
        where: { btp_nombre: tipoId, btp_estado: { not: 'eliminado' } as any },
      });
      if (found) {
        tipoId = found.btp_id;
      } else {
        throw new BadRequestException(
          `El tipo de postgrado '${tipoId}' no es válido.`,
        );
      }
    }

    try {
      return await this.prisma.bp_posgrado.create({
        data: {
          user_id: userId,
          btp_id: tipoId,
          bpg_titulo: data.titulo,
          bpg_fecha: posgradoDate,
          bpg_imagen: data.imagen || null,
          created_by: currentUserId,
          bpg_estado: 'activo' as any,
          updated_at: new Date(),
        },
        include: { bp_tipo_posgrado: true },
      });
    } catch (error) {
      throw new BadRequestException(`Error al guardar el postgrado: ${error.message}`);
    }
  }

  async updatePosgrado(id: string, data: any, currentUserId: string) {
    const updateData: any = { updated_by: currentUserId };
    if (data.titulo !== undefined) updateData.bpg_titulo = data.titulo;
    if (data.fecha !== undefined) updateData.bpg_fecha = new Date(data.fecha);
    if (data.imagen !== undefined) updateData.bpg_imagen = data.imagen;
    if (data.tipoPosgradoId !== undefined)
      updateData.btp_id = data.tipoPosgradoId;

    return await this.prisma.bp_posgrado.update({
      where: { bpg_id: id },
      data: updateData,
      include: { bp_tipo_posgrado: true },
    });
  }

  async removePosgrado(id: string, currentUserId: string) {
    return await this.prisma.bp_posgrado.update({
      where: { bpg_id: id },
      data: {
        bpg_estado: 'eliminado' as any,
        deleted_at: new Date(),
        deleted_by: currentUserId,
      },
    });
  }

  async getPosgrados(userId: string) {
    return this.prisma.bp_posgrado.findMany({
      where: { user_id: userId, bpg_estado: { not: 'eliminado' } as any },
      include: { bp_tipo_posgrado: true },
    });
  }

  // ─── PRODUCCIÓN INTELECTUAL CRUD ──────────────────────────────────────────────
  async addProduccion(
    userId: string,
    data: { titulo: string; anioPublicacion: number },
    currentUserId: string,
  ) {
    if (!userId)
      throw new BadRequestException('El ID de usuario es requerido.');
    if (!data.titulo) throw new BadRequestException('El título es requerido.');

    try {
      return await this.prisma.bp_produccion_intelectual.create({
        data: {
          user_id: userId,
          bpi_titulo: data.titulo,
          bpi_anio_publicacion: data.anioPublicacion
            ? Number(data.anioPublicacion)
            : new Date().getFullYear(),
          created_by: currentUserId,
          bpi_estado: 'activo' as any,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      throw new BadRequestException(`Error al guardar la producción: ${error.message}`);
    }
  }

  async updateProduccion(id: string, data: any, currentUserId: string) {
    const updateData: any = { updated_by: currentUserId };
    if (data.titulo !== undefined) updateData.bpi_titulo = data.titulo;
    if (data.anioPublicacion !== undefined)
      updateData.bpi_anio_publicacion = Number(data.anioPublicacion);

    return await this.prisma.bp_produccion_intelectual.update({
      where: { bpi_id: id },
      data: updateData,
    });
  }

  async removeProduccion(id: string, currentUserId: string) {
    return await this.prisma.bp_produccion_intelectual.update({
      where: { bpi_id: id },
      data: {
        bpi_estado: 'eliminado' as any,
        deleted_at: new Date(),
        deleted_by: currentUserId,
      },
    });
  }

  async getProduccion(userId: string) {
    return this.prisma.bp_produccion_intelectual.findMany({
      where: { user_id: userId, bpi_estado: { not: 'eliminado' } as any },
    });
  }

  async getTiposPosgrado() {
    const tipos = await this.prisma.bp_tipo_posgrado.findMany({
      where: { btp_estado: { not: 'eliminado' } as any },
    });
    return tipos.map((t) => ({
      ...t,
      id: t.btp_id,
      nombre: t.btp_nombre,
    }));
  }

  async createTipoPosgrado(data: { nombre: string }) {
    const created = await this.prisma.bp_tipo_posgrado.create({
      data: { btp_nombre: data.nombre, updated_at: new Date() },
    });
    return { ...created, id: created.btp_id, nombre: created.btp_nombre };
  }

  async getCategorias() {
    return this.prisma.mapCategoria.findMany({
      where: { estado: { not: 'eliminado' } },
      orderBy: { nombre: 'asc' },
    });
  }

  async getCargos() {
    return this.prisma.cargo.findMany({
      where: { estado: { not: 'eliminado' } },
    });
  }

  private serializeFicha(data: any) {
    if (!data) return null;

    const obj = JSON.parse(
      JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );

    if (obj.cargoPostulacionId && !obj.cargoId) {
      obj.cargoId = obj.cargoPostulacionId;
    }

    if (obj.id && obj.username && !obj.user) {
      obj.user = {
        id: obj.id,
        nombre: obj.nombre,
        apellidos: obj.apellidos,
        correo: obj.correo,
        username: obj.username,
        ci: obj.ci,
        rda: obj.rda, // Incluido RDA
        fechaNacimiento: obj.fechaNacimiento,
        celular: obj.celular,
        genero: obj.genero,
        direccion: obj.direccion,
        estadoCivil: obj.estadoCivil,
        imagen: obj.imagen,
        departamento: obj.tenant?.nombre || 'No asignado',
      };
    }

    if (obj.bp_posgrado && Array.isArray(obj.bp_posgrado)) {
      obj.postgrados = obj.bp_posgrado.map((p: any) => ({
        ...p,
        id: p.bpg_id,
        titulo: p.bpg_titulo,
        fecha: p.bpg_fecha,
        imagen: p.bpg_imagen,
        tipoPosgradoId: p.btp_id,
        tipoPosgrado: p.bp_tipo_posgrado
          ? {
            ...p.bp_tipo_posgrado,
            id: p.bp_tipo_posgrado.btp_id,
            nombre: p.bp_tipo_posgrado.btp_nombre,
          }
          : null,
      }));
      delete obj.bp_posgrado;
    }

    if (obj.bp_produccion_intelectual && Array.isArray(obj.bp_produccion_intelectual)) {
      obj.produccionIntelectual = obj.bp_produccion_intelectual.map((p: any) => ({
        ...p,
        id: p.bpi_id,
        titulo: p.bpi_titulo,
        anioPublicacion: p.bpi_anio_publicacion,
      }));
      delete obj.bp_produccion_intelectual;
    }

    return obj;
  }
}
