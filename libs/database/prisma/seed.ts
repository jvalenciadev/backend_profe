import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando Seeder Masivo (9 Departamentos + Multi-Usuarios)...');

    try {
        const hashedPassword = await bcrypt.hash('secret123', 10);

        // --- 1. ROLES ---
        const rolesNames = ['SUPER_ADMIN', 'RESPONSABLE_DEPARTAMENTO', 'FACILITADOR', 'AUDITOR'];
        const roles: any = {};
        for (const name of rolesNames) {
            roles[name] = await prisma.role.upsert({
                where: { name },
                update: {},
                create: { name, guardName: 'web' },
            });
        }

        // --- 2. DEPARTAMENTOS (Los 9 de Bolivia) ---
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

        // --- 3. PROCESAMIENTO POR DEPARTAMENTO ---
        for (const d of depsData) {
            console.log(`📌 Procesando: ${d.nombre}...`);

            // Upsert Departamento
            let dep = await prisma.departamento.findFirst({ where: { nombre: d.nombre } });
            if (!dep) {
                dep = await prisma.departamento.create({ data: { ...d } });
            }

            // Crear Sede Central para este departamento
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
                        contacto1: 70000000 + Math.floor(Math.random() * 9999999)
                    }
                });
            }

            // --- USUARIOS POR TENANT ---

            // 1. Un Responsable de Departamento
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
                where: { userId_roleId_modelType: { userId: respUser.id, roleId: roles['RESPONSABLE_DEPARTAMENTO'].id, modelType: 'App\\User' } },
                update: {},
                create: { userId: respUser.id, roleId: roles['RESPONSABLE_DEPARTAMENTO'].id, modelType: 'App\\User' },
            });

            // 2. Un Facilitador (Docente)
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

            // Vincular Facilitador a la Sede
            await prisma.userSede.upsert({
                where: { userId_sedeId: { userId: facUser.id, sedeId: sede.id } },
                update: {},
                create: { userId: facUser.id, sedeId: sede.id }
            });

            // --- PROGRAMA POR TENANT ---
            const progCode = `PROG-${d.abreviacion}-2024`;
            const progExist = await prisma.programa.findFirst({ where: { codigo: progCode } });
            if (!progExist) {
                // Necesitamos maestros básicos para el programa
                const dur = await prisma.programaDuracion.findFirst() || await prisma.programaDuracion.create({ data: { nombre: '1 MES', semana: 4 } });
                const ver = await prisma.programaVersion.findFirst() || await prisma.programaVersion.create({ data: { nombre: 'V1', numero: 1, gestion: '2024' } });
                const tip = await prisma.programaTipo.findFirst() || await prisma.programaTipo.create({ data: { nombre: 'CURSO' } });
                const mod = await prisma.programaModalidad.findFirst() || await prisma.programaModalidad.create({ data: { nombre: 'VIRTUAL' } });

                await prisma.programa.create({
                    data: {
                        nombre: `CURSO DE CAPACITACIÓN - ${d.nombre}`,
                        codigo: progCode,
                        contenido: `Capacitación docente en el departamento de ${d.nombre}`,
                        cargaHoraria: 40,
                        costo: 100,
                        banner: 'banner.jpg',
                        afiche: 'afiche.jpg',
                        fechaIniIns: new Date(),
                        fechaFinIns: new Date(),
                        fechaIniClase: new Date(),
                        duracionId: dur.id,
                        versionId: ver.id,
                        tipoId: tip.id,
                        modalidadId: mod.id,
                        tenantId: dep.id
                    }
                });
            }
        }

        // --- 4. SUPER ADMIN (GLOBAL) ---
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
            where: { userId_roleId_modelType: { userId: superAdmin.id, roleId: roles['SUPER_ADMIN'].id, modelType: 'App\\User' } },
            update: {},
            create: { userId: superAdmin.id, roleId: roles['SUPER_ADMIN'].id, modelType: 'App\\User' },
        });

        console.log('✅ Seeder Masivo completado con éxito.');
        console.log('🔑 Usuarios creados: admin, resp_lp, fac_lp, resp_cb, fac_cb, etc. (Password: secret123)');

    } catch (error) {
        console.error('❌ Error fatal en el Seeder:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
