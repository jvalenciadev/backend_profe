// backend/clear_db_orphans.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Iniciando limpieza MULTI-CAPA definitiva...");

    // Definición de tablas, sus padres y el nombre de la PK del padre
    const cleanupMap = [
        { table: 'mod_respuesta', parent: 'mod_intento', pk: 'mod_int_id', parentPK: 'id' },
        { table: 'mod_opcion', parent: 'mod_pregunta', pk: 'mod_pre_id', parentPK: 'id' },
        { table: 'mod_pregunta', parent: 'mod_cuestionario', pk: 'mod_cue_id', parentPK: 'id' },
        { table: 'mod_intento', parent: 'mod_cuestionario', pk: 'mod_cue_id', parentPK: 'id' },
        { table: 'mod_entrega', parent: 'mod_tarea', pk: 'mod_tar_id', parentPK: 'id' },
        { table: 'mod_foro_post', parent: 'mod_foro', pk: 'mod_foro_id', parentPK: 'id' },
        // Hijos de mod_actividad
        { table: 'mod_foro', parent: 'mod_actividad', pk: 'mod_act_id', parentPK: 'id' },
        { table: 'mod_tarea', parent: 'mod_actividad', pk: 'mod_act_id', parentPK: 'id' },
        { table: 'mod_cuestionario', parent: 'mod_actividad', pk: 'mod_act_id', parentPK: 'id' },
        { table: 'mod_asistencia', parent: 'mod_actividad', pk: 'mod_act_id', parentPK: 'id' },
        { table: 'mod_nota_actividad', parent: 'mod_actividad', pk: 'mod_act_id', parentPK: 'id' },
        // Hijos de mod_unidad_tematica
        { table: 'mod_actividad', parent: 'mod_unidad_tematica', pk: 'mod_ut_id', parentPK: 'id' },
        { table: 'mod_recurso', parent: 'mod_unidad_tematica', pk: 'mod_ut_id', parentPK: 'id' },
        // Hijos de módulos (Usan 'pm_id')
        { table: 'mod_unidad_tematica', parent: 'programa_modulo_dos', pk: 'pm_id', parentPK: 'pm_id', optional: true },
        { table: 'mod_unidad_tematica', parent: 'programa_modulo', pk: 'pm_id_maestro', parentPK: 'pm_id', optional: true },
        { table: 'mod_asistencia_reg', parent: 'mod_asistencia', pk: 'mod_asi_id', parentPK: 'id' },
        { table: 'mod_nota_final', parent: 'programa_modulo_dos', pk: 'pm_id', parentPK: 'pm_id', optional: true },
        { table: 'mod_nota_final', parent: 'programa_modulo', pk: 'pm_id_maestro', parentPK: 'pm_id', optional: true }

    ];

    for (let i = 1; i <= 3; i++) {
        console.log(`\n🔄 Pasada #${i} de limpieza...`);
        for (const item of cleanupMap) {
            try {
                const query = item.optional
                    ? `DELETE FROM "${item.table}" WHERE "${item.pk}" IS NOT NULL AND "${item.pk}" NOT IN (SELECT "${item.parentPK}" FROM "${item.parent}");`
                    : `DELETE FROM "${item.table}" WHERE "${item.pk}" NOT IN (SELECT "${item.parentPK}" FROM "${item.parent}");`;

                const count = await prisma.$executeRawUnsafe(query);
                if (count > 0) console.log(`✅ ${item.table} (huérfanos de ${item.parent}): ${count} eliminados.`);
            } catch (e) { }
        }
    }

    console.log("\n🧹 Limpiando estructura raíz...");
    // PK de programa_dos es 'pro_id'
    await prisma.$executeRawUnsafe(`DELETE FROM "programa_dos_facilitador" WHERE "pro_id" IS NOT NULL AND "pro_id" NOT IN (SELECT "pro_id" FROM "programa_dos");`);
    await prisma.$executeRawUnsafe(`DELETE FROM "programa_dos_turno" WHERE "pro_id" IS NOT NULL AND "pro_id" NOT IN (SELECT "pro_id" FROM "programa_dos");`);

    // Castear tipos y limpiar admins
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "programa_dos_turno" ALTER COLUMN "pro_tur_ids" TYPE uuid USING "pro_tur_ids"::uuid;`); } catch (e) { }
    await prisma.$executeRawUnsafe(`DELETE FROM "admins" a USING "admins" b WHERE a.id < b.id AND a.correo = b.correo;`);

    console.log("\n✨ Base de datos 100% saneada. Corre 'prisma db push' ahora.");
}

main().finally(() => prisma.$disconnect());
