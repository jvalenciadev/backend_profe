import { Controller, Get, Query, Injectable, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { PoliciesGuard } from '@app/common/casl/policies.guard';
import { CrudControllerFactory } from '@app/common/utils/crud-controller.factory';
import { GenericCrudService, PrismaService } from '@app/database';

// ─── Cargo (tabla: cargo) ─────────────────────────────────────────────────────
@Injectable()
export class CargosService extends GenericCrudService<any> {
  constructor(p: PrismaService) {
    super(p, 'cargo');
  }
}

@Controller('cargos')
export class CargosController extends CrudControllerFactory('cargos') {
  constructor(public service: CargosService) {
    super(service);
  }
}

// ─── Map Cargo ────────────────────────────────────────────────────────────────
@Injectable()
export class MapCargosService extends GenericCrudService<any> {
  constructor(private p2: PrismaService) {
    super(p2, 'mapCargo');
  }

  async findAll(filter: any = {}) {
    return this.p2.mapCargo.findMany({ where: { estado: { not: 'eliminado' } }, orderBy: { nombre: 'asc' } });
  }
}

@Controller('map-cargos')
export class MapCargosController extends CrudControllerFactory('map-cargos') {
  constructor(public service: MapCargosService) {
    super(service);
  }
}

// ─── Map Categoría ────────────────────────────────────────────────────────────
@Injectable()
export class MapCategoriasService extends GenericCrudService<any> {
  constructor(private p3: PrismaService) {
    super(p3, 'mapCategoria');
  }

  async findAll(filter: any = {}) {
    return this.p3.mapCategoria.findMany({ where: { estado: { not: 'eliminado' } }, orderBy: { nombre: 'asc' } });
  }
}

@Controller('map-categorias')
export class MapCategoriasController extends CrudControllerFactory('map-categorias') {
  constructor(public service: MapCategoriasService) {
    super(service);
  }
}

// ─── Map Especialidad ─────────────────────────────────────────────────────────
@Injectable()
export class MapEspecialidadesService extends GenericCrudService<any> {
  constructor(private p4: PrismaService) {
    super(p4, 'mapEspecialidad');
  }

  async findAll(filter: any = {}) {
    return this.p4.mapEspecialidad.findMany({ where: { estado: { not: 'eliminado' } }, orderBy: { nombre: 'asc' } });
  }
}

@Controller('map-especialidades')
export class MapEspecialidadesController extends CrudControllerFactory('map-especialidades') {
  constructor(public service: MapEspecialidadesService) {
    super(service);
  }
}

// ─── Map Nivel ────────────────────────────────────────────────────────────────
@Injectable()
export class MapNivelesService extends GenericCrudService<any> {
  constructor(private p5: PrismaService) {
    super(p5, 'mapNivel');
  }

  async findAll(filter: any = {}) {
    return this.p5.mapNivel.findMany({ where: { estado: { not: 'eliminado' } }, orderBy: { nombre: 'asc' } });
  }
}

@Controller('map-niveles')
export class MapNivelesController extends CrudControllerFactory('map-niveles') {
  constructor(public service: MapNivelesService) {
    super(service);
  }
}

// ─── Map Subsistema ───────────────────────────────────────────────────────────
@Injectable()
export class MapSubsistemasService extends GenericCrudService<any> {
  constructor(private p6: PrismaService) {
    super(p6, 'mapSubsistema');
  }

  async findAll(filter: any = {}) {
    return this.p6.mapSubsistema.findMany({ where: { estado: { not: 'eliminado' } }, orderBy: { nombre: 'asc' } });
  }
}

@Controller('map-subsistemas')
export class MapSubsistemasController extends CrudControllerFactory('map-subsistemas') {
  constructor(public service: MapSubsistemasService) {
    super(service);
  }
}

// ─── Map Persona (magisterio) ───────────────────────────────────────────────────
@Injectable()
export class MapPersonasService extends GenericCrudService<any> {
  constructor(private readonly p: PrismaService) {
    super(p, 'mapPersona');
  }

  async findAllWithRelations(filters: {
    search?: string;
    carId?: string;
    catId?: string;
    espId?: string;
    subId?: string;
    nivId?: string;
    estado?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, carId, catId, espId, subId, nivId, estado, page = 1, limit = 20 } = filters;

    const where: any = { estado: { not: 'eliminado' } };

    if (estado && estado !== 'todos') where.estado = estado;
    if (carId) where.carId = carId;
    if (catId) where.catId = catId;
    if (espId) where.espId = espId;
    if (subId) where.subId = subId;
    if (nivId) where.nivId = nivId;

    if (search) {
      where.OR = [
        { nombre1: { contains: search, mode: 'insensitive' } },
        { nombre2: { contains: search, mode: 'insensitive' } },
        { apellido1: { contains: search, mode: 'insensitive' } },
        { apellido2: { contains: search, mode: 'insensitive' } },
        { correo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.p.mapPersona.count({ where }),
      this.p.mapPersona.findMany({
        where,
        skip,
        take: limit,
        include: {
          cargo: true,
          categoria: true,
          especialidad: true,
          subsistema: true,
          nivel: true,
        },
        orderBy: [{ apellido1: 'asc' }, { nombre1: 'asc' }],
      }),
    ]);

    return {
      data: data.map((p) => ({
        ...p,
        // Solo BigInt no-UUID necesita serialización
        ci: p.ci.toString(),
        genId: p.genId.toString(),
        areaId: p.areaId.toString(),
        rda: p.rda?.toString() ?? null,
        dgesttla: p.dgesttla?.toString() ?? null,
        didep: p.didep?.toString() ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Controller('map-personas')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class MapPersonasController {
  constructor(private readonly service: MapPersonasService) { }

  @Get()
  async findAll(@Query() query: any) {
    return this.service.findAllWithRelations({
      search: query.search,
      carId: query.carId || undefined,
      catId: query.catId || undefined,
      espId: query.espId || undefined,
      subId: query.subId || undefined,
      nivId: query.nivId || undefined,
      estado: query.estado,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }
}
