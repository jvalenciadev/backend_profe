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
  ) {}

  // ─── REGISTRO INICIAL (crea User en admins + ficha BancoProfesional) ─────────
  async requestVerification(email: string) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getHours() + 15); // 15 minutos

    this.verificationCodes.set(email, { code, expires });

    await this.mailService.sendPasswordResetEmail(email, code, 'Postulante');
    return { message: 'Código enviado' };
  }

  async registrar(data: any) {
    console.log('Senior Registrar Request received');

    // 1. Normalización y Limpieza de Datos
    const ciRaw = String(data.ci || data.per_ci || data.bp_ci || '').trim();
    const cargoIdValue = (data.cargoId || data.car_id || '').trim();
    const categoriaIdValue = data.categoriaId || data.cat_id;
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
    const verification = this.verificationCodes.get(data.correo);
    if (
      !verification ||
      verification.code !== data.verificationCode ||
      verification.expires < new Date()
    ) {
      throw new BadRequestException(
        'El código de verificación es incorrecto o ha expirado.',
      );
    }
    this.verificationCodes.delete(data.correo); // Limpiar después de usar

    // 3. Conversión Segura a BigInt
    let ciBigInt: bigint;
    try {
      // Eliminar cualquier caracter no numérico por seguridad
      ciBigInt = BigInt(ciRaw.replace(/\D/g, ''));
    } catch (e) {
      throw new BadRequestException(
        'El formato del CI no es válido (solo números).',
      );
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
    const birthDate = new Date(data.fechaNac);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException(
        'La fecha de nacimiento es inválida o tiene un formato incorrecto.',
      );
    }

    // 7. Transacción Atómica de Registro
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Crear Usuario Principal con todos los datos
        const user = await tx.user.create({
          data: {
            correo: data.correo,
            username: data.username,
            password: hashedPassword,
            nombre: String(data.nombre).toUpperCase(),
            apellidos: String(data.apellidos).toUpperCase(),
            fechaNacimiento: data.fechaNac || null,
            ci: ciBigInt,
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
    } catch (error) {
      console.error('CRITICAL: Error in Registration Transaction:', error);
      throw new BadRequestException(
        'No se pudo completar el registro. Verifique que todos los datos sean correctos.',
      );
    }
  }

  // ─── OBTENER MI FICHA (para el postulante logueado) ──────────────────────────
  async getMiFicha(userId: string) {
    console.log(`Getting ficha for userId: ${userId}`);
    const ficha = await this.prisma.user.findFirst({
      where: { id: userId, estado: { not: 'eliminado' } },
      include: {
        cargoPostulacion: true,
        tenant: true,
        bp_posgrado: { include: { bp_tipo_posgrado: true } },
        bp_produccion_intelectual: true,
      },
    });
    if (!ficha) {
      console.warn(`Ficha not found for user ${userId}`);
      return null;
    }
    return this.serializeFicha(ficha);
  }

  // ─── LISTAR TODOS (para admins) ───────────────────────────────────────────────
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

  // ─── OBTENER UNA FICHA POR ID ─────────────────────────────────────────────────
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

  // ─── ACTUALIZAR FICHA (postulante o admin) ────────────────────────────────────
  async update(id: string, data: any, currentUserId: string) {
    console.log(
      `Updating ficha for user ${id} with data:`,
      JSON.stringify(data),
    );

    try {
      const ficha = await this.prisma.user.findFirst({ where: { id } });
      if (!ficha) throw new NotFoundException('Ficha no encontrada');

      const updateData: any = { updatedBy: currentUserId };
      // Campos de datos personales directos
      if (data.nombre) updateData.nombre = data.nombre;
      if (data.apellidos) updateData.apellidos = data.apellidos;
      if (data.fechaNac) updateData.fechaNacimiento = data.fechaNac;
      if (data.ci) updateData.ci = BigInt(data.ci);
      if (data.correo && data.correo !== ficha.correo) {
        // Validación de código de verificación para nuevo correo
        const verification = this.verificationCodes.get(data.correo);
        if (
          !verification ||
          verification.code !== data.verificationCode ||
          verification.expires < new Date()
        ) {
          throw new BadRequestException(
            'El código de verificación para el nuevo correo es incorrecto o ha expirado.',
          );
        }
        this.verificationCodes.delete(data.correo);
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
        // Campos de perfil y datos personales que pueden ser actualizados
        'resumenProfesional',
        'habilidades',
        'idiomas',
        'experienciaLaboral',
        'linkedinUrl',
        'celular',
        'genero',
        'direccion',
        'estadoCivil',
        'imagen',
      ];

      allowedFields.forEach((f) => {
        if (data[f] !== undefined) {
          // Conversión explícita de booleanos si vienen como string
          if (f === 'esMaestro' || f === 'tieneProduccion') {
            updateData[f] = data[f] === true || data[f] === 'true';
          } else {
            updateData[f] = data[f];
          }
        }
      });

      if (data.cargoId !== undefined) {
        const cargoId = String(data.cargoId).trim();
        updateData.cargoPostulacionId =
          cargoId && cargoId !== 'null' ? cargoId : null;
      }

      console.log(
        'Update Data Prepared:',
        JSON.stringify(updateData, (_, v) =>
          typeof v === 'bigint' ? v.toString() : v,
        ),
      );

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

  // ─── ELIMINAR FICHA ───────────────────────────────────────────────────────────
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

  // ─── ACTUALIZAR ESTADO Y ASIGNAR ROL (APROBAR o DAR DE BAJA) ──────────────────
  async aprobar(
    id: string,
    data: { roleId: string; tenantId?: string; status?: string },
    currentUserId: string,
  ) {
    const targetStatus = (data.status || 'activo').toLowerCase();
    console.log(
      `Updating professional ${id} to status: ${targetStatus} with roleId: ${data.roleId}`,
    );

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar estado y opcionalmente tenant
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

      // 2. Eliminar rol de postulante y asignar nuevo rol
      // Buscamos si ya tiene el rol deseado para no duplicar
      const hasRole = user.roles.some((r) => r.roleId === data.roleId);

      if (!hasRole) {
        // Eliminamos roles previos si se desea una limpieza total,
        // o solo el de POSTULACION_PROFE si existiera.
        // En este caso, reemplazaremos los roles para que tenga EL nuevo rol asignado.
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
    console.log('DEBUG: addPosgrado called with:', {
      userId,
      tipoPosgradoId: data.tipoPosgradoId,
      titulo: data.titulo,
      currentUserId,
    });

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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tipoId,
      );

    if (!isUuid) {
      // Smart lookup: si no es UUID, buscamos por nombre (ej. 'FORMACION SUPERIOR')
      const found = await this.prisma.bp_tipo_posgrado.findFirst({
        where: { btp_nombre: tipoId, btp_estado: { not: 'eliminado' } as any },
      });
      if (found) {
        tipoId = found.btp_id;
      } else {
        // Si no existe, lo creamos dinámicamente o lanzamos error. Mejor lanzamos error descriptivo.
        throw new BadRequestException(
          `El tipo de postgrado '${tipoId}' no es válido. Seleccione uno de la lista.`,
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
      console.error('DATABASE ERROR in addPosgrado:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'El tipo de postgrado o usuario no existe.',
        );
      }
      throw new BadRequestException(
        `Error al guardar el postgrado: ${error.message}`,
      );
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
    data: {
      titulo: string;
      anioPublicacion: number;
    },
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
      console.error('DATABASE ERROR in addProduccion:', error);
      throw new BadRequestException(
        `Error al guardar la producción: ${error.message}`,
      );
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

  // ─── TIPOS DE POSGRADO CRUD ───────────────────────────────────────────────────
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
      data: {
        btp_nombre: data.nombre,
        updated_at: new Date(),
      },
    });
    return { ...created, id: created.btp_id, nombre: created.btp_nombre };
  }

  async updateTipoPosgrado(
    id: string,
    data: { nombre?: string; estado?: string },
  ) {
    const updateData: any = {};
    if (data.nombre) updateData.btp_nombre = data.nombre;
    if (data.estado) updateData.btp_estado = data.estado as Estado;

    const updated = await this.prisma.bp_tipo_posgrado.update({
      where: { btp_id: id },
      data: updateData,
    });
    return { ...updated, id: updated.btp_id, nombre: updated.btp_nombre };
  }

  async removeTipoPosgrado(id: string) {
    return this.prisma.bp_tipo_posgrado.update({
      where: { btp_id: id },
      data: { btp_estado: 'eliminado' as any },
    });
  }

  // ─── CATEGORIAS (Dummy por desuso de MapCategoria) ───────────────────────────
  async getCategorias() {
    return [];
  }

  // ─── CARGOS CRUD ──────────────────────────────────────────────────────────────
  async getCargos() {
    return this.prisma.cargo.findMany({
      where: { estado: { not: 'eliminado' } },
    });
  }

  async createCargo(data: { nombre: string }) {
    return this.prisma.cargo.create({ data: { nombre: data.nombre } });
  }

  async updateCargo(id: string, data: { nombre?: string; estado?: string }) {
    const updateData: any = { ...data };
    if (data.estado) updateData.estado = data.estado as Estado;
    return this.prisma.cargo.update({ where: { id }, data: updateData });
  }

  async removeCargo(id: string) {
    return this.prisma.cargo.update({
      where: { id },
      data: { estado: 'eliminado', deletedAt: new Date() },
    });
  }

  // ─── HELPER: serializar BigInt y Estructura ──────────────────────────────────
  private serializeFicha(data: any) {
    if (!data) return null;

    const obj = JSON.parse(
      JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );

    // Mapear cargoPostulacionId a cargoId para consistencia con frontend
    if (obj.cargoPostulacionId && !obj.cargoId) {
      obj.cargoId = obj.cargoPostulacionId;
    }

    // Si el objeto es un User, asegurar que tenga la propiedad 'user' para el frontend
    if (obj.id && obj.username && !obj.user) {
      obj.user = {
        id: obj.id,
        nombre: obj.nombre,
        apellidos: obj.apellidos,
        correo: obj.correo,
        username: obj.username,
        ci: obj.ci,
        fechaNacimiento: obj.fechaNacimiento,
        celular: obj.celular,
        genero: obj.genero,
        direccion: obj.direccion,
        estadoCivil: obj.estadoCivil,
        imagen: obj.imagen,
        departamento: obj.tenant?.nombre || 'No asignado',
      };
    }

    // Mapear campos de posgrados
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

    // Mapear campos de producción intelectual
    if (
      obj.bp_produccion_intelectual &&
      Array.isArray(obj.bp_produccion_intelectual)
    ) {
      obj.produccionIntelectual = obj.bp_produccion_intelectual.map(
        (p: any) => ({
          ...p,
          id: p.bpi_id,
          titulo: p.bpi_titulo,
          anioPublicacion: p.bpi_anio_publicacion,
        }),
      );
      delete obj.bp_produccion_intelectual;
    }

    return obj;
  }
}
