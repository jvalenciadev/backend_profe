import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  CreateCorrespondenciaDto,
  CorTipoDocumento,
} from './dto/create-correspondencia.dto';

const PREFIJOS: Record<CorTipoDocumento, string> = {
  INFORME: 'INF',
  NOTA_INTERNA: 'NI',
  MEMORANDUM: 'MEM',
  INSTRUCTIVO: 'INST',
};

@Injectable()
export class CorrespondenciaService {
  constructor(private readonly prisma: PrismaService) { }

  private async generarCite(
    tx: any,
    tipo: CorTipoDocumento,
    tenantId?: string | null,
  ): Promise<{
    cite: string;
    hr: string;
    correlativo: number;
    gestion: number;
  }> {
    const gestion = new Date().getFullYear();

    // 1. Lógica CITE (Segmentada por Tipo y Departamento)
    let siglaTerritorial = 'MESC';
    if (tenantId) {
      const dep = await tx.departamento.findUnique({
        where: { id: tenantId },
        select: { abreviacion: true },
      });
      if (dep?.abreviacion) siglaTerritorial = dep.abreviacion.toUpperCase();
    }

    const ultimoDocCite = await tx.corDocumento.findFirst({
      where: { tipo, gestion, tenantId },
      orderBy: { correlativo: 'desc' },
    });
    const correlativo = (ultimoDocCite?.correlativo ?? 0) + 1;
    const prefijo = PREFIJOS[tipo];
    const cite = `${prefijo}/PROFE/${siglaTerritorial} Nro. ${correlativo}/${gestion}`;

    // 2. Lógica HOJA DE RUTA (Global y Universal)
    // Buscamos el último documento de TODO el sistema en este año
    const ultimoDocHR = await tx.corDocumento.findFirst({
      where: { gestion },
      orderBy: { createdAt: 'desc' },
    });

    let numHR = 0;
    if (ultimoDocHR?.hr) {
      const partes = ultimoDocHR.hr.split('/');
      numHR = parseInt(partes[0], 10) || 0;
    }

    const proximoHR = numHR + 1;
    const hr = `${proximoHR.toString().padStart(4, '0')}/${gestion}`;

    return { cite, hr, correlativo, gestion };
  }

  async create(dto: CreateCorrespondenciaDto, creatorId: string) {
    const esDestinatarioPropio = dto.destinatarios.some(
      (p) => p.userId === creatorId,
    );
    const esViaPropia = (dto.vias ?? []).some((p) => p.userId === creatorId);
    if (esDestinatarioPropio || esViaPropia) {
      throw new BadRequestException(
        'No puede agregarse a sí mismo como destinatario o vía',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener tenantId y contexto del creador
      const user = await tx.user.findUnique({
        where: { id: creatorId },
        select: { tenantId: true },
      });

      const tenantId = user?.tenantId;
      const { cite, hr, correlativo, gestion } = await this.generarCite(
        tx,
        dto.tipo,
        tenantId,
      );

      const participantes = [
        ...dto.destinatarios.map((p) => ({
          userId: p.userId,
          cargoLiteral: p.cargoLiteral,
          rol: 'DESTINATARIO',
        })),
        ...(dto.vias ?? []).map((p) => ({
          userId: p.userId,
          cargoLiteral: p.cargoLiteral,
          rol: 'VIA',
        })),
        ...dto.remitentes.map((p) => ({
          userId: p.userId,
          cargoLiteral: p.cargoLiteral,
          rol: 'REMITENTE',
        })),
      ];

      return (tx.corDocumento as any).create({
        data: {
          tipo: dto.tipo,
          cite,
          hr, // HR Global generada
          correlativo,
          gestion,
          tenantId, // Vinculamos el documento al departamento del creador
          referencia: dto.referencia,
          contenido: dto.contenido,
          estado: 'ELABORACION',
          participantes: { create: participantes },
          seguimientos: {
            create: {
              accion: 'CREACION',
              detalle: `Documento elaborado. CITE asignado: ${cite}`,
              usuarioId: creatorId,
            },
          },
        },
        include: {
          participantes: {
            include: {
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  cargoStr: true,
                },
              },
            },
          },
          seguimientos: {
            include: {
              usuario: { select: { id: true, nombre: true, apellidos: true } },
            },
          },
        },
      });
    });
  }

  /**
   * Busca un documento por CITE o por Hoja de Ruta (HR).
   * La HR es única en todo el sistema, lo que la hace el mejor identificador público.
   */
  async findByCite(query: string) {
    const doc = await this.prisma.corDocumento.findFirst({
      where: {
        OR: [
          { cite: { contains: query, mode: 'insensitive' } },
          { hr: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
              },
            },
          },
        },
        seguimientos: {
          orderBy: { fecha: 'asc' },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
              },
            },
            destinatario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
              },
            },
          },
        },
      },
    });
    if (!doc)
      throw new NotFoundException(
        `No se encontró ningún documento con CITE o HR: "${query}"`,
      );
    return doc;
  }

  async getBandejaCategorizada(userId: string) {
    const rawTodos = await this.prisma.corDocumento.findMany({
      where: {
        participantes: { some: { userId } },
        deletedAt: null,
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
                imagen: true,
                tenantId: true,
              },
            },
          },
        },
        seguimientos: {
          orderBy: { fecha: 'desc' },
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, tenantId: true } },
            destinatario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
                tenantId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const departamentos = await this.prisma.departamento.findMany({
      select: { id: true, nombre: true, abreviacion: true },
    });
    const depMap = new Map<string, { id: string; nombre: string; abreviacion: string }>();
    departamentos.forEach((d) => depMap.set(d.id, d));

    const todos = rawTodos.map((d) => {
      let tenantInfo = d.tenantId ? depMap.get(d.tenantId) : null;
      if (!tenantInfo && d.cite) {
        const match = d.cite.match(/PROFE\/([A-Z]+)\b/i);
        const sigla = match ? match[1].toUpperCase() : 'NAC';
        tenantInfo = { id: d.tenantId || sigla, nombre: `Sede ${sigla}`, abreviacion: sigla };
      } else if (!tenantInfo) {
        tenantInfo = { id: 'NAC', nombre: 'Sede Nacional', abreviacion: 'NAC' };
      }

      return {
        ...d,
        tenantInfo,
      };
    });

    const ahora = new Date();

    const mapearConAlerta = (docs: any[]) =>
      docs.map((d) => {
        // Calcular días desde el último movimiento
        const ultimoMovimiento = d.seguimientos[0]?.fecha || d.createdAt;
        const diasTranscurridos = Math.floor(
          (ahora.getTime() - new Date(ultimoMovimiento).getTime()) /
          (1000 * 60 * 60 * 24),
        );

        return {
          ...d,
          diasMora: diasTranscurridos,
          alerta: diasTranscurridos > 10,
          nivelAlerta:
            diasTranscurridos > 15
              ? 'CRITICO'
              : diasTranscurridos > 10
                ? 'MORA'
                : 'NORMAL',
        };
      });

    // Recibidos: documentos en la bandeja del usuario (envíos, derivaciones, recepciones y devoluciones)
    const recibidosPrev = todos.filter((d) => {
      if (
        d.estado === 'ELABORACION' ||
        d.estado === 'ARCHIVADO' ||
        d.estado === 'CANCELADO'
      )
        return false;

      const s0 = d.seguimientos[0];
      if (!s0) return false;

      // Caso A: Se le envió/derivó el documento al usuario
      if (
        (s0.accion === 'ENVIO' || s0.accion === 'DERIVACION') &&
        s0.destinatarioId === userId
      ) {
        return true;
      }

      // Caso B: El usuario recibió el documento y aún no lo ha derivado/archivado
      if (s0.accion === 'RECEPCION' && s0.usuarioId === userId) {
        return true;
      }

      // Caso C: El documento fue DEVUELTO y le corresponde al remitente o destinatario devuelto
      if (
        d.estado === 'DEVUELTO' &&
        (s0.destinatarioId === userId ||
          s0.accion === 'DEVOLUCION' ||
          d.participantes.some((p) => p.userId === userId && p.rol === 'REMITENTE'))
      ) {
        return true;
      }

      return false;
    });

    return {
      recibidos: mapearConAlerta(recibidosPrev),
      // Enviados: documentos en curso enviados por el remitente o VÍA
      enviados: mapearConAlerta(
        todos.filter(
          (d) =>
            d.estado !== 'ELABORACION' &&
            d.estado !== 'ARCHIVADO' &&
            d.estado !== 'CANCELADO' &&
            d.estado !== 'DEVUELTO' &&
            // Documentos en curso del remitente
            (d.participantes.some(
              (p) => p.userId === userId && p.rol === 'REMITENTE',
            ) ||
              // VÍAs que ya derivaron
              (d.participantes.some(
                (p) => p.userId === userId && p.rol === 'VIA',
              ) &&
                d.seguimientos.some(
                  (s) =>
                    s.usuarioId === userId &&
                    (s.accion === 'DERIVACION' || s.accion === 'ENVIO'),
                ))),
        ),
      ),
      // Borradores: únicamente borradores en estado ELABORACION
      enProceso: todos.filter(
        (d) =>
          d.estado === 'ELABORACION' &&
          d.participantes.some(
            (p) => p.userId === userId && p.rol === 'REMITENTE',
          ),
      ),
      archivados: todos.filter((d) => d.estado === 'ARCHIVADO'),
    };
  }

  private isValidUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  async getHistorialTenants(tenantIdFilter?: string, currentUserId?: string) {
    let targetTenantId: string | undefined = undefined;
    let targetSigla: string | undefined = undefined;

    if (tenantIdFilter && tenantIdFilter !== 'TODOS') {
      const isUuid = this.isValidUuid(tenantIdFilter);
      const dept = await this.prisma.departamento.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: tenantIdFilter }] : []),
            { abreviacion: { equals: tenantIdFilter, mode: 'insensitive' as const } },
          ],
        },
      });

      if (dept) {
        targetTenantId = dept.id;
        targetSigla = dept.abreviacion.toUpperCase();
      } else {
        targetSigla = tenantIdFilter.toUpperCase();
      }
    }

    const whereClause: any = {};
    if (targetTenantId) {
      whereClause.documento = {
        OR: [
          { tenantId: targetTenantId },
          { cite: { contains: `/PROFE/${targetSigla}` } },
          { cite: { contains: `/${targetSigla}/` } },
        ],
      };
    } else if (targetSigla) {
      whereClause.documento = {
        OR: [
          { cite: { contains: `/PROFE/${targetSigla}` } },
          { cite: { contains: `/${targetSigla}/` } },
        ],
      };
    }

    // Filtrar estrictamente por seg_destinatario_id = id_usuario_logeado
    if (currentUserId) {
      whereClause.destinatarioId = currentUserId;
    }

    const seguimientos = await this.prisma.corSeguimiento.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
      take: 300,
      include: {
        documento: {
          select: {
            id: true,
            cite: true,
            hr: true,
            tipo: true,
            referencia: true,
            estado: true,
            tenantId: true,
            createdAt: true,
            participantes: {
              include: {
                usuario: {
                  select: {
                    id: true,
                    nombre: true,
                    apellidos: true,
                    cargoStr: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            cargoStr: true,
            tenantId: true,
          },
        },
        destinatario: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            cargoStr: true,
            tenantId: true,
          },
        },
      },
    });

    const departamentos = await this.prisma.departamento.findMany({
      select: { id: true, nombre: true, abreviacion: true },
    });

    const tenantMap = new Map<string, { id: string; nombre: string; abreviacion: string }>();
    departamentos.forEach((d) => tenantMap.set(d.id, d));

    let enrichedSeguimientos = seguimientos.map((s) => {
      const docTenant = s.documento?.tenantId ? tenantMap.get(s.documento.tenantId) : null;
      const userTenant = s.usuario?.tenantId ? tenantMap.get(s.usuario.tenantId) : null;
      const destTenant = s.destinatario?.tenantId ? tenantMap.get(s.destinatario.tenantId) : null;

      const siglaCiteMatch = s.documento?.cite?.match(/PROFE\/([A-Z]+)\b/i);
      const siglaCite = siglaCiteMatch ? siglaCiteMatch[1].toUpperCase() : 'NAC';

      const remitentePart = (s.documento as any)?.participantes?.find((p: any) => p.rol === 'REMITENTE');
      const creador = remitentePart?.usuario ? {
        id: remitentePart.usuario.id,
        nombre: remitentePart.usuario.nombre,
        apellidos: remitentePart.usuario.apellidos,
        cargoStr: remitentePart.usuario.cargoStr || remitentePart.cargoLiteral,
      } : null;

      return {
        ...s,
        documento: {
          id: s.documento.id,
          cite: s.documento.cite,
          hr: s.documento.hr,
          tipo: s.documento.tipo,
          referencia: s.documento.referencia,
          estado: s.documento.estado,
          tenantId: s.documento.tenantId,
          createdAt: s.documento.createdAt,
          creador,
        },
        docTenant: docTenant || { id: s.documento?.tenantId || siglaCite, nombre: `Departamento ${siglaCite}`, abreviacion: siglaCite },
        userTenant: userTenant || { id: s.usuario?.tenantId || siglaCite, nombre: `Departamento ${siglaCite}`, abreviacion: siglaCite },
        destTenant: destTenant || (s.destinatario ? { id: s.destinatario.tenantId || 'GLOBAL', nombre: 'Destino Externo', abreviacion: 'EXT' } : null),
      };
    });

    if (targetSigla) {
      enrichedSeguimientos = enrichedSeguimientos.filter((s) =>
        s.docTenant.abreviacion === targetSigla ||
        (targetTenantId && s.docTenant.id === targetTenantId) ||
        s.documento?.cite?.toUpperCase().includes(`/${targetSigla}`)
      );
    }

    const statsByTenant: Record<string, { tenantId: string; abreviacion: string; nombre: string; totalMovimientos: number; creaciones: number; derivaciones: number; recepciones: number; archivados: number }> = {};

    enrichedSeguimientos.forEach((s) => {
      const key = s.docTenant.abreviacion || 'NAC';
      if (!statsByTenant[key]) {
        statsByTenant[key] = {
          tenantId: s.docTenant.id,
          abreviacion: key,
          nombre: s.docTenant.nombre,
          totalMovimientos: 0,
          creaciones: 0,
          derivaciones: 0,
          recepciones: 0,
          archivados: 0,
        };
      }
      statsByTenant[key].totalMovimientos += 1;
      if (s.accion === 'CREACION') statsByTenant[key].creaciones += 1;
      if (s.accion === 'DERIVACION' || s.accion === 'ENVIO') statsByTenant[key].derivaciones += 1;
      if (s.accion === 'RECEPCION') statsByTenant[key].recepciones += 1;
      if (s.accion === 'ARCHIVADO') statsByTenant[key].archivados += 1;
    });

    return {
      historial: enrichedSeguimientos,
      departamentos,
      statsByTenant: Object.values(statsByTenant),
    };
  }

  async findByUser(userId: string) {
    return this.prisma.corDocumento.findMany({
      where: {
        participantes: { some: { userId } },
        deletedAt: null,
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
              },
            },
          },
        },
        seguimientos: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async avanzarEstado(
    documentoId: string,
    accion: string,
    detalle: string,
    usuarioId: string,
    archivoUrl?: string,
    nuevoDestinatarioId?: string,
  ) {
    const doc = await this.prisma.corDocumento.findUnique({
      where: { id: documentoId },
      include: { participantes: true, seguimientos: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Lógica Senior: Inmutabilidad
    if (doc.estado === 'ARCHIVADO') {
      throw new BadRequestException(
        'El documento ya está archivado y no puede ser modificado',
      );
    }

    // Lógica de validación para envío, cancelación o devolución
    if (accion === 'ENVIO') {
      if (
        doc.estado !== 'ELABORACION' &&
        doc.estado !== 'DEVUELTO'
      ) {
        throw new BadRequestException(
          'Solo se pueden enviar documentos que estén en Elaboración o Devueltos',
        );
      }
      // Al reenviar desde DEVUELTO, solo el remitente puede hacerlo
      if (doc.estado === 'DEVUELTO') {
        const esRemitente = doc.participantes.some(
          (p) => p.userId === usuarioId && p.rol === 'REMITENTE',
        );
        if (!esRemitente) {
          throw new BadRequestException(
            'Solo el remitente original puede reenviar el documento',
          );
        }
      }
    }

    if (accion === 'CANCELAR') {
      // Un borrador (ELABORACION) puede descartarse directamente: nunca fue enviado ni circuló.
      // Un documento ENVIADO puede cancelarse solo si aún no fue recibido ni derivado.
      if (doc.estado !== 'ENVIADO' && doc.estado !== 'ELABORACION') {
        throw new BadRequestException(
          'Solo se pueden cancelar documentos en estado ELABORACION o ENVIADO (que aún no han sido recibidos)',
        );
      }
      const esRemitente = doc.participantes.some(
        (p) => p.userId === usuarioId && p.rol === 'REMITENTE',
      );
      if (!esRemitente) {
        throw new BadRequestException(
          'Solo el remitente original puede cancelar el documento',
        );
      }
      // Si ya fue ENVIADO: verificar que no haya circulado aún
      if (doc.estado === 'ENVIADO') {
        const yaCirculo = doc.seguimientos.some(
          (s) =>
            s.accion === 'RECEPCION' ||
            s.accion === 'DERIVACION' ||
            s.accion === 'DEVOLUCION',
        );
        if (yaCirculo) {
          throw new BadRequestException(
            'No se puede cancelar el envío porque el documento ya ha ingresado en trámite anteriormente',
          );
        }
      }
    }

    if (accion === 'DEVOLUCION') {
      if (
        doc.estado !== 'ENVIADO' &&
        doc.estado !== 'EN_TRAMITE' &&
        doc.estado !== 'RECIBIDO'
      ) {
        throw new BadRequestException(
          'Solo se pueden devolver documentos en estado ENVIADO, EN_TRAMITE o RECIBIDO',
        );
      }
    }

    if (
      accion === 'DERIVACION' ||
      (accion === 'RECEPCION' && nuevoDestinatarioId)
    ) {
      if (nuevoDestinatarioId === usuarioId) {
        throw new BadRequestException(
          'No puede derivar el documento a sí mismo',
        );
      }
    }

    // Lógica de Custodia General:
    // El usuario debe tener la custodia del documento para recibir, derivar, devolver o archivar.
    if (
      accion === 'RECEPCION' ||
      accion === 'DERIVACION' ||
      accion === 'DEVOLUCION' ||
      accion === 'ARCHIVADO'
    ) {
      const sortedSegs = [...doc.seguimientos].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );
      const s0 = sortedSegs[0];
      let tieneCustodia = false;
      if (s0) {
        if (s0.accion === 'RECEPCION' && s0.usuarioId === usuarioId) {
          tieneCustodia = true;
        } else if (
          (s0.accion === 'ENVIO' || s0.accion === 'DERIVACION') &&
          s0.destinatarioId === usuarioId
        ) {
          tieneCustodia = true;
        }
      }
      if (!tieneCustodia) {
        throw new BadRequestException(
          'No tienes la custodia actual de este documento para realizar esta acción',
        );
      }
    }

    const esParticipanteActivo = doc.participantes.some(
      (p) =>
        p.userId === usuarioId &&
        (p.rol === 'DESTINATARIO' || p.rol === 'VIA' || p.rol === 'REMITENTE'),
    );

    if (!esParticipanteActivo) {
      throw new BadRequestException(
        'No tienes permisos para operar sobre este documento',
      );
    }

    const estadoMap: Record<string, string> = {
      ENVIO: 'ENVIADO',
      RECEPCION: 'RECIBIDO',
      DERIVACION: 'EN_TRAMITE',
      ARCHIVADO: 'ARCHIVADO',
      CANCELAR: 'CANCELADO',
      DEVOLUCION: 'DEVUELTO',
    };

    return this.prisma.$transaction(async (tx) => {
      // 1. Si hay un nuevo destinatario dinámico, lo inyectamos en participantes
      if (nuevoDestinatarioId) {
        const existe = doc.participantes.some(
          (p) => p.userId === nuevoDestinatarioId,
        );
        if (!existe) {
          await tx.corParticipante.create({
            data: {
              documentoId,
              userId: nuevoDestinatarioId,
              rol: 'DESTINATARIO',
            },
          });
        }
      }

      // 2. Calcular a quién va dirigido este movimiento (para mostrar en el historial)
      let destinatarioId: string | null = null;
      if (accion === 'ENVIO' || accion === 'DERIVACION') {
        if (nuevoDestinatarioId) {
          // Derivación dinámica: el nuevo destinatario seleccionado
          destinatarioId = nuevoDestinatarioId;
        } else {
          // Envio estándar: primero busca VIAs, si no hay, va al DESTINATARIO
          const vias = doc.participantes.filter(
            (p) => p.rol === 'VIA' && p.userId !== usuarioId,
          );
          const destinatarios = doc.participantes.filter(
            (p) => p.rol === 'DESTINATARIO',
          );
          const siguiente = vias.length > 0 ? vias[0] : destinatarios[0];
          destinatarioId = siguiente?.userId ?? null;
        }
      }

      // 3. Crear el registro de seguimiento con el archivo adjunto y el destinatario
      const seg = await tx.corSeguimiento.create({
        data: {
          documentoId,
          accion,
          detalle,
          usuarioId,
          archivoUrl: archivoUrl || null,
          destinatarioId,
        },
      });

      // 4. Actualizar el estado del documento y su archivo principal
      await tx.corDocumento.update({
        where: { id: documentoId },
        data: {
          estado: estadoMap[accion] ?? doc.estado,
          archivoPdf: archivoUrl || doc.archivoPdf,
        },
      });

      return seg;
    });
  }

  async updatePdf(documentoId: string, url: string) {
    return this.prisma.corDocumento.update({
      where: { id: documentoId },
      data: { archivoPdf: url },
    });
  }

  async buscarUsuarios(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { apellidos: { contains: query, mode: 'insensitive' } },
          { cargoStr: { contains: query, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        cargoStr: true,
        imagen: true,
      },
      take: 10,
    });
  }
  async findById(id: string) {
    return this.prisma.corDocumento.findUnique({
      where: { id },
      include: {
        participantes: { include: { usuario: true } },
        seguimientos: {
          include: {
            usuario: true,
            destinatario: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                cargoStr: true,
              },
            },
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });
  }
}
