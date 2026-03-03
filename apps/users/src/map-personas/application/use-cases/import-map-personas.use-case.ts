import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as XLSX from 'xlsx';

export interface ImportJobStatus {
    jobId: string;
    total: number;
    current: number;
    success: number;
    updated: number;
    errors: any[];
    status: 'processing' | 'completed' | 'failed' | 'cancelled';
}

@Injectable()
export class ImportMapPersonasUseCase {
    private readonly logger = new Logger(ImportMapPersonasUseCase.name);
    private activeJobs = new Map<string, ImportJobStatus>();
    private readonly BATCH_SIZE = 1000;

    constructor(private readonly prisma: PrismaService) { }

    getStatus(jobId: string): ImportJobStatus | undefined {
        return this.activeJobs.get(jobId);
    }

    cancelJob(jobId: string) {
        const job = this.activeJobs.get(jobId);
        if (job && job.status === 'processing') {
            job.status = 'cancelled';
        }
    }

    async execute(fileBuffer: Buffer, jobId: string) {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const job: ImportJobStatus = {
            jobId,
            total: data.length,
            current: 0,
            success: 0,
            updated: 0,
            errors: [],
            status: 'processing',
        };

        this.activeJobs.set(jobId, job);
        this.processBatches(data, job);

        return { jobId, total: data.length };
    }

    private async processBatches(data: any[], job: ImportJobStatus) {
        try {
            const catalogs = await this.loadCatalogs();

            for (let i = 0; i < data.length; i += this.BATCH_SIZE) {
                if (job.status === 'cancelled') break;

                const batch = data.slice(i, i + this.BATCH_SIZE);
                await this.processBatch(batch, job, catalogs, i);
                job.current = Math.min(i + this.BATCH_SIZE, job.total);
            }

            if (job.status === 'processing') {
                job.status = 'completed';
            }
        } catch (error) {
            this.logger.error(`Error crítico en importación ${job.jobId}:`, error);
            job.status = 'failed';
        }
    }

    private async processBatch(batch: any[], job: ImportJobStatus, catalogs: any, startIndex: number) {
        const cis = batch.map(row => String(row['CI'] || row['ci'] || '').trim()).filter(Boolean);

        const existingPersonas = await this.prisma.mapPersona.findMany({
            where: { ci: { in: cis } },
            select: { id: true, ci: true, complemento: true }
        });

        for (let j = 0; j < batch.length; j++) {
            if (job.status === 'cancelled') break;

            const row = batch[j];
            const rowNum = startIndex + j + 2;

            // Flexibilidad en nombres de columna CI y Complemento
            const ci = String(row['CI'] || row['ci'] || row['Cédula'] || '').trim();
            const complemento = String(row['Complemento'] || row['complemento'] || row['COMPLEMENTO'] || '').trim().toUpperCase();

            if (!ci) {
                job.errors.push({ row: rowNum, ci: 'N/A', error: 'CI no encontrado en la fila' });
                continue;
            }

            try {
                // EXTRACCIÓN FLEXIBLE DE GÉNERO (1=Masculino, 2=Femenino)
                let rawGenero = row['Genero'] || row['genero'] || row['GÉNERO'] || row['Sexo'] || row['sexo'];
                let generoValue = '';

                if (rawGenero !== undefined && rawGenero !== null) {
                    const gStr = String(rawGenero).trim().toUpperCase();
                    if (gStr === '1' || gStr === 'MASCULINO' || gStr === 'M') {
                        generoValue = 'MASCULINO';
                    } else if (gStr === '2' || gStr === 'FEMENINO' || gStr === 'F') {
                        generoValue = 'FEMENINO';
                    } else {
                        generoValue = gStr; // Si es otro texto, lo dejamos como está para ver si existe en catálogo
                    }
                }

                // BOOLEANOS FLEXIBLES
                const enFuncion = this.parseBooleanFlexible(row['EnFuncion'] || row['en_funcion'] || row['Funcionando']);
                const libretaMilitar = this.parseBooleanFlexible(row['LibretaMilitar'] || row['libreta_militar'] || row['Libreta']);

                // BÚSQUEDA Y CREACIÓN DE CATÁLOGOS POR NOMBRE
                const carId = await this.getOrCreateCatalogId(this.prisma.mapCargo, row['Cargo'] || row['cargo'], catalogs.cargos);
                const espId = await this.getOrCreateCatalogId(this.prisma.mapEspecialidad, row['Especialidad'] || row['especialidad'], catalogs.especialidades);
                const catId = await this.getOrCreateCatalogId(this.prisma.mapCategoria, row['Categoria'] || row['categoria'], catalogs.categorias);
                const nivId = await this.getOrCreateCatalogId(this.prisma.mapNivel, row['Nivel'] || row['nivel'], catalogs.niveles);
                const subId = await this.getOrCreateCatalogId(this.prisma.mapSubsistema, row['Subsistema'] || row['subsistema'], catalogs.subsistemas);
                const genId = await this.getOrCreateCatalogId(this.prisma.mapGenero, generoValue, catalogs.generos);
                const areaId = await this.getOrCreateCatalogId(this.prisma.mapArea, row['Area'] || row['area'], catalogs.areas);

                const personaData: any = {
                    rda: row['RDA'] || row['rda'] ? BigInt(row['RDA'] || row['rda']) : null,
                    nombre1: String(row['Nombre1'] || row['Nombre'] || row['nombre1'] || '').trim().toUpperCase(),
                    nombre2: row['Nombre2'] || row['nombre2'] ? String(row['Nombre2'] || row['nombre2']).trim().toUpperCase() : null,
                    apellido1: String(row['Apellido1'] || row['apellido1'] || row['Paterno'] || row['Apellido Paterno'] || row['APELLIDO_PATERNO'] || '').trim().toUpperCase(),
                    apellido2: (row['Apellido2'] || row['apellido2'] || row['Materno'] || row['Apellido Materno'] || row['APELLIDO_MATERNO'])
                        ? String(row['Apellido2'] || row['apellido2'] || row['Materno'] || row['Apellido Materno'] || row['APELLIDO_MATERNO']).trim().toUpperCase()
                        : null,
                    fechaNacimiento: this.parseExcelDate(row['fecha de nacimiento'] || row['FechaNacimiento'] || row['FECHA_NAC']),
                    celular: row['Celular'] || row['celular'] ? Number(row['Celular'] || row['celular']) : 0,
                    correo: row['Correo'] || row['correo'] ? String(row['Correo'] || row['correo']).trim() : "",
                    carId,
                    espId,
                    catId,
                    nivId,
                    subId,
                    genId,
                    areaId,
                    estado: 'activo',
                    enFuncion,
                    libretaMilitar,
                };

                const existing = existingPersonas.find(p =>
                    p.ci === ci && (p.complemento || "") === (complemento || "")
                );

                if (existing) {
                    await this.prisma.mapPersona.update({ where: { id: existing.id }, data: personaData });
                    job.updated++;
                } else {
                    await this.prisma.mapPersona.create({ data: { ...personaData, ci, complemento } });
                    job.success++;
                }
            } catch (err: any) {
                job.errors.push({
                    row: rowNum,
                    ci,
                    nombre: `${row['Nombre1'] || ''} ${row['Apellido1'] || ''}`.trim(),
                    error: err.message || 'Error en validación'
                });
            }
        }
    }

    private parseBooleanFlexible(val: any): boolean {
        if (val === undefined || val === null || val === '') return false;
        if (typeof val === 'boolean') return val;
        const clean = String(val).trim().toUpperCase();
        return ['SI', 'SÍ', 'S', 'TRUE', '1', 'VERDADERO', 'YES', 'Y'].includes(clean);
    }

    private async loadCatalogs() {
        const [cargos, especialidades, categorias, niveles, subsistemas, generos, areas] = await Promise.all([
            this.prisma.mapCargo.findMany(),
            this.prisma.mapEspecialidad.findMany(),
            this.prisma.mapCategoria.findMany(),
            this.prisma.mapNivel.findMany(),
            this.prisma.mapSubsistema.findMany(),
            this.prisma.mapGenero.findMany(),
            this.prisma.mapArea.findMany(),
        ]);

        return {
            cargos: new Map(cargos.map(c => [c.nombre.toUpperCase(), c.id])),
            especialidades: new Map(especialidades.map(c => [c.nombre.toUpperCase(), c.id])),
            categorias: new Map(categorias.map(c => [c.nombre.toUpperCase(), c.id])),
            niveles: new Map(niveles.map(c => [c.nombre.toUpperCase(), c.id])),
            subsistemas: new Map(subsistemas.map(c => [c.nombre.toUpperCase(), c.id])),
            generos: new Map(generos.map(c => [c.nombre.toUpperCase(), c.id])),
            areas: new Map(areas.map(c => [c.nombre.toUpperCase(), c.id])),
        };
    }

    private async getOrCreateCatalogId(model: any, name: any, cache: Map<string, string>): Promise<string | null> {
        if (!name) return null;
        const cleanName = String(name).trim().toUpperCase();
        if (!cleanName) return null;

        if (cache.has(cleanName)) return cache.get(cleanName)!;

        // Doble verificación en BD por si se creó en otra ejecución paralela
        let record = await model.findUnique({ where: { nombre: cleanName } });
        if (!record) {
            record = await model.create({ data: { nombre: cleanName, estado: 'activo' } });
        }

        cache.set(cleanName, record.id);
        return record.id;
    }

    private parseExcelDate(val: any): Date {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
    }
}
