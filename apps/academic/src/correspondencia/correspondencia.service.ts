import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateCorrespondenciaDto, CorTipoDocumento } from './dto/create-correspondencia.dto';

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
  ): Promise<{ cite: string; hr: string; correlativo: number; gestion: number }> {
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
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener tenantId y contexto del creador
      const user = await tx.user.findUnique({
        where: { id: creatorId },
        select: { tenantId: true }
      });

      const tenantId = user?.tenantId;
      const { cite, hr, correlativo, gestion } = await this.generarCite(tx, dto.tipo, tenantId);

      const participantes = [
        ...dto.destinatarios.map((p) => ({ userId: p.userId, cargoLiteral: p.cargoLiteral, rol: 'DESTINATARIO' })),
        ...(dto.vias ?? []).map((p) => ({ userId: p.userId, cargoLiteral: p.cargoLiteral, rol: 'VIA' })),
        ...dto.remitentes.map((p) => ({ userId: p.userId, cargoLiteral: p.cargoLiteral, rol: 'REMITENTE' })),
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
              usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
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

  async findByCite(cite: string) {
    const doc = await this.prisma.corDocumento.findFirst({
      where: { cite: { contains: cite, mode: 'insensitive' } },
      include: {
        participantes: {
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
          },
        },
        seguimientos: {
          orderBy: { fecha: 'asc' },
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
          },
        },
      },
    });
    if (!doc) throw new NotFoundException(`No se encontró ningún documento con CITE: "${cite}"`);
    return doc;
  }

  async getBandejaCategorizada(userId: string) {
    const todos = await this.prisma.corDocumento.findMany({
      where: {
        participantes: { some: { userId } },
        deletedAt: null,
      },
      include: {
        participantes: {
          include: {
            usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true, imagen: true } },
          },
        },
        seguimientos: { orderBy: { fecha: 'desc' }, take: 1, include: { usuario: { select: { nombre: true, apellidos: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      recibidos: todos.filter(d =>
        d.estado !== 'ELABORACION' &&
        d.estado !== 'ARCHIVADO' &&
        d.participantes.some(p => p.userId === userId && (p.rol === 'DESTINATARIO' || p.rol === 'VIA'))
      ),
      enviados: todos.filter(d =>
        d.estado !== 'ELABORACION' &&
        d.estado !== 'ARCHIVADO' &&
        d.participantes.some(p => p.userId === userId && p.rol === 'REMITENTE')
      ),
      enProceso: todos.filter(d =>
        d.estado === 'ELABORACION' &&
        d.participantes.some(p => p.userId === userId && p.rol === 'REMITENTE')
      ),
      archivados: todos.filter(d => d.estado === 'ARCHIVADO'),
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
            usuario: { select: { id: true, nombre: true, apellidos: true, cargoStr: true } },
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
      include: { participantes: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Lógica Senior: Inmutabilidad
    if (doc.estado === 'ARCHIVADO') {
      throw new BadRequestException('El documento ya está archivado y no puede ser modificado');
    }

    // Lógica de Custodia: ¿Tiene el usuario el documento en su poder?
    const esParticipanteActivo = doc.participantes.some(
      (p) =>
        p.userId === usuarioId &&
        (p.rol === 'DESTINATARIO' || p.rol === 'VIA' || p.rol === 'REMITENTE'),
    );

    if (!esParticipanteActivo) {
      throw new BadRequestException('No tienes permisos para operar sobre este documento');
    }

    const estadoMap: Record<string, string> = {
      ENVIO: 'ENVIADO',
      RECEPCION: 'RECIBIDO',
      DERIVACION: 'EN_TRAMITE',
      ARCHIVADO: 'ARCHIVADO',
    };

    return this.prisma.$transaction(async (tx) => {
      // 1. Si hay un nuevo destinatario, lo inyectamos en la lista de participantes
      if (nuevoDestinatarioId) {
        // Verificar si ya existe para no duplicar
        const existe = doc.participantes.some(p => p.userId === nuevoDestinatarioId);
        if (!existe) {
          await tx.corParticipante.create({
            data: { documentoId, userId: nuevoDestinatarioId, rol: 'DESTINATARIO' }
          });
        }
      }

      // 2. Crear el registro de seguimiento con el archivo adjunto (si existe)
      const seg = await tx.corSeguimiento.create({
        data: {
          documentoId,
          accion,
          detalle,
          usuarioId,
          archivoUrl: archivoUrl || null,
        },
      });

      // 3. Actualizar el estado del documento y su archivo principal
      await tx.corDocumento.update({
        where: { id: documentoId },
        data: {
          estado: estadoMap[accion] ?? doc.estado,
          archivoPdf: archivoUrl || doc.archivoPdf, // Si subió un nuevo archivo, este pasa a ser el principal
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
      select: { id: true, nombre: true, apellidos: true, cargoStr: true, imagen: true },
      take: 10,
    });
  }
  async findById(id: string) {
    return this.prisma.corDocumento.findUnique({
      where: { id },
      include: {
        participantes: { include: { usuario: true } },
        seguimientos: { include: { usuario: true }, orderBy: { fecha: 'desc' } },
      },
    });
  }
}
