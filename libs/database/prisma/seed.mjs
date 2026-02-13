import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando Seeder Masivo (Versión MJS)...');

    try {
        const hashedPassword = await bcrypt.hash('secret123', 10);

        // --- 1. ROLES ---
        const rolesNames = ['ADMINISTRADOR_SISTEMA', 'RESPONSABLE_DEPARTAMENTAL', 'FACILITADOR', 'AUDITOR'];
        const roles = {};
        for (const name of rolesNames) {
            roles[name] = await prisma.role.upsert({
                where: { name },
                update: {},
                create: { name, guardName: 'web' },
            });
        }

        // --- 2. DEPARTAMENTOS ---
        const depsData = [
            { nombre: 'LA PAZ', abreviacion: 'LP' },
            { nombre: 'COCHABAMBA', abreviacion: 'CB' },
            { nombre: 'SANTA CRUZ', abreviacion: 'SC' },
            { nombre: 'ORURO', abreviacion: 'OR' },
            { nombre: 'POTOSI', abreviacion: 'PT' },
            { nombre: 'TARIJA', abreviacion: 'TJ' },
            { nombre: 'CHUQUISACA', abreviacion: 'CH' },
            { nombre: 'BENI', abreviacion: 'BN' },
            { nombre: 'PANDO', abreviacion: 'PN' }
        ];

        for (const d of depsData) {
            console.log(`📌 Procesando: ${d.nombre}...`);

            let dep = await prisma.departamento.findFirst({ where: { nombre: d.nombre } });
            if (!dep) {
                dep = await prisma.departamento.create({ data: d });
            }

            const sedeNombre = `SEDE CENTRAL ${d.nombre}`;
            let sede = await prisma.sede.findFirst({ where: { nombre: sedeNombre } });
            if (!sede) {
                sede = await prisma.sede.create({
                    data: {
                        nombre: sedeNombre,
                        descripcion: `Sede principal del departamento de ${d.nombre}`,
                        horario: '08:00 - 18:30',
                        turno: 'DIURNO',
                        ubicacion: `Calle Principal de ${d.nombre} #123`,
                        departamentoId: dep.id,
                        contacto1: 72233445
                    }
                });
            }

            // Responsable
            const respUsername = `resp_${d.abreviacion.toLowerCase()}`;
            const respUser = await prisma.user.upsert({
                where: { username: respUsername },
                update: { tenantId: dep.id },
                create: {
                    username: respUsername,
                    correo: `${respUsername}@profe.bo`,
                    password: hashedPassword,
                    nombre: 'Responsable',
                    apellidos: d.nombre,
                    tenantId: dep.id,
                },
            });

            await prisma.userRole.upsert({
                where: { userId_roleId_modelType: { userId: respUser.id, roleId: roles['RESPONSABLE_DEPARTAMENTAL'].id, modelType: 'App\\User' } },
                update: {},
                create: { userId: respUser.id, roleId: roles['RESPONSABLE_DEPARTAMENTAL'].id, modelType: 'App\\User' },
            });

            // Facilitador
            const facUsername = `fac_${d.abreviacion.toLowerCase()}`;
            const facUser = await prisma.user.upsert({
                where: { username: facUsername },
                update: { tenantId: dep.id },
                create: {
                    username: facUsername,
                    correo: `${facUsername}@profe.bo`,
                    password: hashedPassword,
                    nombre: 'Facilitador',
                    apellidos: d.nombre,
                    tenantId: dep.id,
                },
            });

            await prisma.userRole.upsert({
                where: { userId_roleId_modelType: { userId: facUser.id, roleId: roles['FACILITADOR'].id, modelType: 'App\\User' } },
                update: {},
                create: { userId: facUser.id, roleId: roles['FACILITADOR'].id, modelType: 'App\\User' },
            });

            await prisma.userSede.upsert({
                where: { userId_sedeId: { userId: facUser.id, sedeId: sede.id } },
                update: {},
                create: { userId: facUser.id, sedeId: sede.id }
            });
        }

        // SuperAdmin
        console.log('👑 Asegurando SuperAdmin...');
        const superAdmin = await prisma.user.upsert({
            where: { username: 'admin' },
            update: {},
            create: {
                username: 'admin',
                correo: 'admin@profe.bo',
                password: hashedPassword,
                nombre: 'Administrador',
                apellidos: 'Principal',
            },
        });

        await prisma.userRole.upsert({
            where: { userId_roleId_modelType: { userId: superAdmin.id, roleId: roles['ADMINISTRADOR_SISTEMA'].id, modelType: 'App\\User' } },
            update: {},
            create: { userId: superAdmin.id, roleId: roles['ADMINISTRADOR_SISTEMA'].id, modelType: 'App\\User' },
        });

        console.log('✅ Seeder completado con éxito.');
    } catch (e) {
        console.error('❌ Error en el seeder:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
