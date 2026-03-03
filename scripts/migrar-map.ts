import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateMapData(filePath: string) {
    console.log('🚀 Iniciando migración masiva...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        console.log(`📊 Total registros detectados en Excel: ${data.length}`);

        // 1. Extraer valores únicos para catálogos
        const catalogs = {
            cargos: new Set<string>(),
            especialidades: new Set<string>(),
            categorias: new Set<string>(),
            niveles: new Set<string>(),
            subsistemas: new Set<string>(),
        };

        data.forEach(row => {
            if (row['Cargo']) catalogs.cargos.add(String(row['Cargo']).trim().toUpperCase());
            if (row['Especialidad']) catalogs.especialidades.add(String(row['Especialidad']).trim().toUpperCase());
            if (row['Categoria']) catalogs.categorias.add(String(row['Categoria']).trim().toUpperCase());
            if (row['Nivel']) catalogs.niveles.add(String(row['Nivel']).trim().toUpperCase());
            if (row['Subsistema']) catalogs.subsistemas.add(String(row['Subsistema']).trim().toUpperCase());
        });

        console.log('🔄 Sincronizando catálogos...');

        const sync = async (model: any, items: Set<string>, nameCol: string = 'nombre') => {
            const map = new Map<string, string>();
            for (const name of Array.from(items)) {
                const record = await model.upsert({
                    where: { [nameCol]: name },
                    update: {},
                    create: { [nameCol]: name, estado: 'activo' }
                });
                map.set(name, record.id);
            }
            return map;
        };

        const maps = {
            cargo: await sync(prisma.mapCargo, catalogs.cargos),
            especialidad: await sync(prisma.mapEspecialidad, catalogs.especialidades),
            categoria: await sync(prisma.mapCategoria, catalogs.categorias),
            nivel: await sync(prisma.mapNivel, catalogs.niveles),
            subsistema: await sync(prisma.mapSubsistema, catalogs.subsistemas),
        };

        console.log('✅ Catálogos sincronizados.');

        // 2. Insertar personas en batches
        const BATCH_SIZE = 5000;
        let processed = 0;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const prepared = batch.map(row => {
                const carId = maps.cargo.get(String(row['Cargo'] || '').trim().toUpperCase());
                const espId = maps.especialidad.get(String(row['Especialidad'] || '').trim().toUpperCase());
                const catId = maps.categoria.get(String(row['Categoria'] || '').trim().toUpperCase());
                const nivId = maps.nivel.get(String(row['Nivel'] || '').trim().toUpperCase());
                const subId = maps.subsistema.get(String(row['Subsistema'] || '').trim().toUpperCase());

                if (!row['CI'] || !carId || !espId || !catId || !nivId || !subId) {
                    return null;
                }

                return {
                    ci: BigInt(row['CI']),
                    rda: row['RDA'] ? BigInt(row['RDA']) : null,
                    complemento: row['Complemento'] ? String(row['Complemento']) : null,
                    nombre1: String(row['Nombre1'] || '').trim().toUpperCase(),
                    nombre2: String(row['Nombre2'] || '').trim().toUpperCase(),
                    apellido1: String(row['Apellido1'] || '').trim().toUpperCase(),
                    apellido2: String(row['Apellido2'] || '').trim().toUpperCase(),
                    fechaNacimiento: parseExcelDate(row['fecha de nacimiento']),
                    genId: BigInt(String(row['genero']).toLowerCase() === 'm' ? 1 : 2),
                    areaId: BigInt(1),
                    carId: carId,
                    espId: espId,
                    catId: catId,
                    nivId: nivId,
                    subId: subId,
                    estado: 'activo',
                    enFuncion: true,
                };
            }).filter(p => p !== null) as any[];

            if (prepared.length > 0) {
                await prisma.mapPersona.createMany({
                    data: prepared,
                    skipDuplicates: true,
                });
            }

            processed += batch.length;
            console.log(`⏳ Progreso: ${processed} / ${data.length} (${Math.round((processed / data.length) * 100)}%)`);
        }

        console.log('✨ Migración completada con éxito.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

function parseExcelDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        return new Date((val - 25569) * 86400 * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

// Ejecutar: ts-node scripts/migrar-map.ts <path_to_excel>
const filePath = process.argv[2];
if (!filePath) {
    console.error('Por favor, indica la ruta del archivo Excel.');
} else {
    migrateMapData(path.resolve(filePath));
}
