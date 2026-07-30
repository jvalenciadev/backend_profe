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
  constructor(private readonly prisma: PrismaService) {}

  private async generarCite(
    tx: any,
    tipo: CorTipoDocumento,
    tenantId?: string | null,
    documentoPadreId?: string | null,
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
    let hr = '';
    if (documentoPadreId) {
      const docPadre = await tx.corDocumento.findUnique({
        where: { id: documentoPadreId },
        select: { hr: true },
      });
      if (docPadre?.hr) {
        hr = docPadre.hr;
      }
    }

    if (!hr) {
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
      hr = `${proximoHR.toString().padStart(4, '0')}/${gestion}`;
    }

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
        dto.documentoPadreId,
      );

      // Calcular fecha límite si hay plazoDias
      let fechaLimite: Date | null = null;
      if (dto.plazoDias && dto.plazoDias > 0) {
        fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dto.plazoDias);
      }

      // Evaluar estado del plazo si se está respondiendo a un documento padre
      let estadoPlazo: string | null = null;
      if (dto.documentoPadreId) {
        const docPadre = await tx.corDocumento.findUnique({
          where: { id: dto.documentoPadreId },
          select: { fechaLimite: true, createdAt: true },
        });
        if (docPadre) {
          const limite = docPadre.fechaLimite;
          if (limite) {
            estadoPlazo = new Date() <= new Date(limite) ? 'EN_PLAZO' : 'FUERA_DE_PLAZO';
          } else {
            estadoPlazo = 'EN_PLAZO';
          }
        }
      }

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

      const accionSeguimiento = dto.documentoPadreId ? 'RESPUESTA' : 'CREACION';
      const detalleSeguimiento = dto.documentoPadreId
        ? `Respuesta a H.R. registrada con nuevo CITE: ${cite}`
        : `Documento elaborado. CITE asignado: ${cite}`;

      return (tx.corDocumento as any).create({
        data: {
          tipo: dto.tipo,
          cite,
          hr, // HR heredada o nueva
          correlativo,
          gestion,
          tenantId, // Vinculamos el documento al departamento del creador
          referencia: dto.referencia,
          contenido: dto.contenido,
          plazoDias: dto.plazoDias ?? null,
          fechaLimite,
          documentoPadreId: dto.documentoPadreId ?? null,
          estado: 'ELABORACION',
          participantes: { create: participantes },
          seguimientos: {
            create: {
              accion: accionSeguimiento,
              detalle: detalleSeguimiento,
              usuarioId: creatorId,
              estadoPlazo,
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
        documentosHijos: {
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
              orderBy: { fecha: 'desc' },
              include: {
                usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
              },
            },
          },
        },
        documentoPadre: {
          select: {
            id: true,
            cite: true,
            hr: true,
            fechaLimite: true,
            plazoDias: true,
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
        documentosHijos: {
          include: {
            participantes: {
              include: {
                usuario: {
                  select: { id: true, nombre: true, apellidos: true, cargoStr: true },
                },
              },
            },
            seguimientos: {
              orderBy: { fecha: 'desc' },
              include: {
                usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
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

    // Helper para determinar la última transferencia activa
    const getUltimaTransferencia = (doc: any) => {
      const segs = doc.seguimientos || [];
      return segs.find(
        (s: any) =>
          s.destinatarioId &&
          (s.accion === 'ENVIO' ||
            s.accion === 'DERIVACION' ||
            s.accion === 'DEVOLUCION'),
      );
    };

    // 1. Recibidos: Documentos en los que el usuario actual es el CUSTODIO ACTUAL en el último lote de transferencias
    const recibidosPrev = todos.filter((d) => {
      if (
        d.estado === 'ELABORACION' ||
        d.estado === 'ARCHIVADO' ||
        d.estado === 'CANCELADO'
      ) {
        return false;
      }

      const esCreador = d.participantes.some(
        (p: any) => p.userId === userId && p.rol === 'REMITENTE',
      );

      const ultimaTrans = getUltimaTransferencia(d);

      if (ultimaTrans) {
        // Agrupar transferencias simultáneas (±5s) para soporte multi-destinatario
        const ultimaTs = new Date(ultimaTrans.fecha || 0).getTime();
        const transSimultaneas = (d.seguimientos || []).filter(
          (s: any) =>
            s.destinatarioId &&
            (s.accion === 'ENVIO' ||
              s.accion === 'DERIVACION' ||
              s.accion === 'DEVOLUCION') &&
            Math.abs(new Date(s.fecha || 0).getTime() - ultimaTs) <= 5000,
        );

        // Si el usuario en sesión es destinatario de este último lote de transferencias, TIENE LA CUSTODIA.
        const esDestinatarioUltimoLote = transSimultaneas.some(
          (s: any) => s.destinatarioId === userId,
        );
        return esDestinatarioUltimoLote;
      }

      // Si no hay transferencias registradas aún, es Recibido para los DESTINATARIOS/VIAs iniciales (que no sean el creador)
      const esDestinatarioInicial = d.participantes.some(
        (p: any) =>
          (p.rol === 'DESTINATARIO' || p.rol === 'VIA') &&
          p.userId === userId,
      );

      return esDestinatarioInicial && !esCreador;
    });

    return {
      recibidos: mapearConAlerta(recibidosPrev),
      // 2. Enviados: Documentos creados o transferidos por el usuario donde la custodia actual la tiene OTRO usuario
      enviados: mapearConAlerta(
        todos.filter((d) => {
          if (
            d.estado === 'ELABORACION' ||
            d.estado === 'ARCHIVADO' ||
            d.estado === 'CANCELADO' ||
            d.estado === 'DEVUELTO'
          ) {
            return false;
          }

          // Si actualmente está en sus Recibidos (tengo la custodia actual), NO debe salir en Enviados
          if (recibidosPrev.some((r) => r.id === d.id)) {
            return false;
          }

          const esCreador = d.participantes.some(
            (p: any) => p.userId === userId && p.rol === 'REMITENTE',
          );

          const haDerivadoOEnviado = (d.seguimientos || []).some(
            (s: any) =>
              s.usuarioId === userId &&
              (s.accion === 'DERIVACION' || s.accion === 'ENVIO' || s.accion === 'DEVOLUCION'),
          );

          return esCreador || haDerivadoOEnviado;
        }),
      ),
      // Borradores: borradores en estado ELABORACION y documentos cancelados del remitente
      enProceso: todos.filter(
        (d) =>
          (d.estado === 'ELABORACION' || d.estado === 'CANCELADO') &&
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
            plazoDias: true,
            fechaLimite: true,
            documentoPadreId: true,
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
          plazoDias: (s.documento as any).plazoDias,
          fechaLimite: (s.documento as any).fechaLimite,
          documentoPadreId: (s.documento as any).documentoPadreId,
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
      include: {
        participantes: true,
        documentosHijos: { select: { id: true, cite: true } },
        seguimientos: { orderBy: { fecha: 'desc' } },
      },
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
      if (doc.estado !== 'ENVIADO' && doc.estado !== 'ELABORACION' && doc.estado !== 'EN_TRAMITE') {
        throw new BadRequestException(
          'Solo se pueden cancelar documentos en estado ELABORACION, ENVIADO o EN_TRAMITE',
        );
      }
      const esRemitente = doc.participantes.some(
        (p) => p.userId === usuarioId && p.rol === 'REMITENTE',
      );
      const ultimoMov = doc.seguimientos?.[0];
      const fueUltimoEmisor = ultimoMov?.usuarioId === usuarioId && (ultimoMov?.accion === 'ENVIO' || ultimoMov?.accion === 'DERIVACION');

      if (!esRemitente && !fueUltimoEmisor) {
        throw new BadRequestException(
          'Solo el remitente original o el funcionario que realizó la derivación puede cancelar el envío',
        );
      }

      // 1. Verificar si ya fue respondido con un nuevo CITE
      const tieneRespuestas = (doc.documentosHijos || []).length > 0 || doc.seguimientos.some((s) => s.accion === 'RESPUESTA');
      if (tieneRespuestas) {
        throw new BadRequestException(
          'No se puede cancelar el envío porque este trámite ya cuenta con una respuesta o informe emitido',
        );
      }

      // 2. Si fue ENVIADO o DERIVADO: verificar que el destinatario no haya recepcionado o derivado
      if (doc.estado === 'ENVIADO' || doc.estado === 'EN_TRAMITE') {
        const yaCirculo = doc.seguimientos.some(
          (s) =>
            s.accion === 'RECEPCION' ||
            (s.accion === 'DERIVACION' && s.usuarioId !== usuarioId) ||
            s.accion === 'DEVOLUCION' ||
            s.accion === 'ARCHIVADO',
        );
        if (yaCirculo) {
          throw new BadRequestException(
            'No se puede cancelar el envío/derivación porque el destinatario ya recepcionó, derivó o atendió el trámite',
          );
        }
      }

      // 3. Verificar si transcurrieron más de los días de plazo (ej: 7 días)
      const plazoMax = doc.plazoDias || 7;
      const diasTranscurridos = (Date.now() - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diasTranscurridos > plazoMax) {
        throw new BadRequestException(
          `No se puede cancelar el envío porque ha expirado el plazo máximo de ${plazoMax} días desde su emisión`,
        );
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


    // Restricción Mandatoria: El CREADOR / REMITENTE original no puede devolverse el documento a sí mismo.
    if (accion === 'DEVOLUCION') {
      const esCreadorOriginal = doc.participantes.some(
        (p) => p.userId === usuarioId && p.rol === 'REMITENTE',
      );
      if (esCreadorOriginal) {
        throw new BadRequestException(
          'El creador o remitente original no puede devolverse el documento a sí mismo',
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
      const segs = doc.seguimientos || [];

      // Buscar la última transferencia realizada (ENVIO, DERIVACION, DEVOLUCION)
      const ultimaTrans = segs.find(
        (s: any) =>
          s.destinatarioId &&
          (s.accion === 'ENVIO' ||
            s.accion === 'DERIVACION' ||
            s.accion === 'DEVOLUCION'),
      );

      let tieneCustodia = false;

      if (ultimaTrans) {
        // Agrupar transferencias del mismo lote simultáneo (±5s) para soporte multi-destinatario
        const ultimaTs = new Date(ultimaTrans.fecha || 0).getTime();
        const transSimultaneas = segs.filter(
          (s: any) =>
            s.destinatarioId &&
            (s.accion === 'ENVIO' ||
              s.accion === 'DERIVACION' ||
              s.accion === 'DEVOLUCION') &&
            Math.abs(new Date(s.fecha || 0).getTime() - ultimaTs) <= 5000,
        );

        // Si el usuario es el destinatario de la última transferencia (o lote), tiene la custodia.
        const esDestinatarioUltimaTrans = transSimultaneas.some(
          (s: any) => s.destinatarioId === usuarioId,
        );

        // Verificar que el usuario no haya derivado o devuelto POSTERIOR a esa última transferencia
        const fechaUltimaTrans = new Date(ultimaTrans.fecha || 0).getTime();
        const derivoDespues = segs.some(
          (s: any) =>
            s.usuarioId === usuarioId &&
            (s.accion === 'DERIVACION' || s.accion === 'DEVOLUCION') &&
            new Date(s.fecha || 0).getTime() > fechaUltimaTrans,
        );

        tieneCustodia = esDestinatarioUltimaTrans && !derivoDespues;
      } else {
        // Si no hay transferencias en los seguimientos, comprobar si es destinatario/vía inicial
        const esDestinatarioInicial = doc.participantes.some(
          (p: any) =>
            (p.rol === 'DESTINATARIO' || p.rol === 'VIA') &&
            p.userId === usuarioId,
        );
        tieneCustodia = esDestinatarioInicial;
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

      // 2. Calcular los destinatarios a los que va dirigido este movimiento
      let destinatariosTarget: (string | null)[] = [null];
      if (accion === 'ENVIO' || accion === 'DERIVACION') {
        if (nuevoDestinatarioId) {
          // Derivación dinámica: el nuevo destinatario seleccionado
          destinatariosTarget = [nuevoDestinatarioId];
        } else {
          // Envio estándar: Si hay VÍAs, va a TODAS las VÍAs. Si no hay VÍAs, a TODOS los DESTINATARIOS.
          const vias = doc.participantes.filter(
            (p) => p.rol === 'VIA' && p.userId !== usuarioId,
          );
          const destinatarios = doc.participantes.filter(
            (p) => p.rol === 'DESTINATARIO' && p.userId !== usuarioId,
          );

          if (vias.length > 0) {
            destinatariosTarget = vias.map((v) => v.userId);
          } else if (destinatarios.length > 0) {
            destinatariosTarget = destinatarios.map((d) => d.userId);
          }
        }
      } else if (accion === 'DEVOLUCION') {
        const remitenteParticipante = doc.participantes.find(
          (p) => p.rol === 'REMITENTE',
        );
        if (!remitenteParticipante) {
          throw new BadRequestException(
            'No se encontró un remitente original para devolver el documento',
          );
        }
        destinatariosTarget = [remitenteParticipante.userId];
      }

      // 3. Crear el registro de seguimiento para CADA destinatario seleccionado (Soporte multi-destinatario)
      const segsCreated = await Promise.all(
        destinatariosTarget.map((targetId) =>
          tx.corSeguimiento.create({
            data: {
              documentoId,
              accion,
              detalle,
              usuarioId,
              archivoUrl: archivoUrl || null,
              destinatarioId: targetId,
            },
          }),
        ),
      );

      // 4. Actualizar el estado del documento y su archivo principal
      await tx.corDocumento.update({
        where: { id: documentoId },
        data: {
          estado: estadoMap[accion] ?? doc.estado,
          archivoPdf: archivoUrl || doc.archivoPdf,
        },
      });

      return segsCreated[0];
    });
  }

  async updatePdf(documentoId: string, url: string) {
    return this.prisma.corDocumento.update({
      where: { id: documentoId },
      data: { archivoPdf: url },
    });
  }

  async addAdjunto(documentoId: string, url: string) {
    const doc = await this.prisma.corDocumento.findUnique({
      where: { id: documentoId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    const docAny = doc as any;
    const actuales: string[] = Array.isArray(docAny.adjuntos) ? (docAny.adjuntos as string[]) : [];
    return (this.prisma.corDocumento as any).update({
      where: { id: documentoId },
      data: { adjuntos: [...actuales, url] },
    });
  }

  async removeAdjunto(documentoId: string, index: number) {
    const doc = await this.prisma.corDocumento.findUnique({
      where: { id: documentoId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    const docAny = doc as any;
    const actuales: string[] = Array.isArray(docAny.adjuntos) ? (docAny.adjuntos as string[]) : [];
    if (index < 0 || index >= actuales.length) throw new BadRequestException('Índice de adjunto inválido');
    const nuevos = actuales.filter((_, i) => i !== index);
    return (this.prisma.corDocumento as any).update({
      where: { id: documentoId },
      data: { adjuntos: nuevos },
    });
  }

  async buscarUsuarios(query: string) {
    const allowedRoleIds = [
      'c8233c1d-cae1-447f-8f3b-a1757da4aa3a', // FACILITADOR
      '29614aad-668b-43dc-8aba-768c802524ad', // RESPONSABLE
      'beb28e58-0d5a-4edd-83b3-f4f9a1d54d1f', // TECNICOS
      'caf759ed-feeb-4dc7-912c-a7ecf8cc6bdd', // TECNICO MATEMATICO
    ];

    const cleanQuery = query?.trim() ?? '';

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { roles: { some: { roleId: { in: allowedRoleIds } } } },
          { cargoStr: { contains: 'FACILITADOR', mode: 'insensitive' } },
          { cargoStr: { contains: 'RESPONSABLE', mode: 'insensitive' } },
          { cargoStr: { contains: 'TECNICO', mode: 'insensitive' } },
          { cargoStr: { contains: 'TÉCNICO', mode: 'insensitive' } },
        ],
        ...(cleanQuery
          ? {
            AND: [
              {
                OR: [
                  { nombre: { contains: cleanQuery, mode: 'insensitive' } },
                  { apellidos: { contains: cleanQuery, mode: 'insensitive' } },
                  { cargoStr: { contains: cleanQuery, mode: 'insensitive' } },
                ],
              },
            ],
          }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        cargoStr: true,
        imagen: true,
      },
      take: 20,
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

  /**
   * Exportación completa de TODAS las Hojas de Ruta filtradas por tenantId del usuario.
   * Si el usuario NO tiene tenantId (admin global), retorna todos los documentos.
   */
  async exportByTenant(tenantId: string | null) {
    const rawDocs = await this.prisma.corDocumento.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellidos: true, cargoStr: true, tenantId: true },
            },
          },
        },
        seguimientos: {
          orderBy: { fecha: 'desc' },
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, tenantId: true } },
            destinatario: {
              select: { id: true, nombre: true, apellidos: true, cargoStr: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const departamentos = await this.prisma.departamento.findMany({
      select: { id: true, nombre: true, abreviacion: true },
    });
    const depMap = new Map(departamentos.map((d) => [d.id, d]));

    return rawDocs.map((d) => {
      const tenantInfo = d.tenantId ? depMap.get(d.tenantId) ?? null : null;
      return { ...d, tenantInfo };
    });
  }
}
