import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Seeder Masivo (Versión TS)...');

  try {
    const hashedPassword = await bcrypt.hash('secret123', 12);

    // --- 1. ROLES Y PERMISOS ---
    console.log('🛡️ Configurando Roles y Permisos...');

    const rolesList = [
      { name: 'SUPER_ADMIN', desc: 'Control total del sistema' },
      { name: 'RESPONSABLE_DEPARTAMENTAL', desc: 'Gestión por departamento' },
      { name: 'FACILITADOR', desc: 'Gestión académica' },
      { name: 'ESTUDIANTE', desc: 'Acceso a cursos' },
      { name: 'AUDITOR_EXTERNO', desc: 'Solo lectura' },
      { name: 'POSTULACION_PROFE', desc: 'Postulantes al programa PROFE' },
    ];

    const roles: any = {};
    for (const r of rolesList) {
      roles[r.name] = await prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: { name: r.name, guardName: 'api' }, // Cambiado a 'api'
      });
    }

    // Definir permisos básicos
    const permissionsData = [
      { name: 'manage_all', action: 'manage', subject: 'all' },
      { name: 'view_dashboard', action: 'read', subject: 'Dashboard' },
      { name: 'manage_users', action: 'manage', subject: 'User' },
      { name: 'manage_programs', action: 'manage', subject: 'Programa' },
      { name: 'view_reports', action: 'read', subject: 'Report' },
      {
        name: 'manage_banco_profesional',
        action: 'manage',
        subject: 'BancoProfesional',
      },
    ];

    const perms: any = {};
    for (const p of permissionsData) {
      perms[p.name] = await prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: {
          name: p.name,
          action: p.action,
          subject: p.subject,
          guardName: 'api',
        },
      });
    }

    // Asignar permisos a roles
    // SUPER_ADMIN -> Todo
    await prisma.rolePermission.createMany({
      data: [
        {
          roleId: roles['SUPER_ADMIN'].id,
          permissionId: perms['manage_all'].id,
        },
      ],
      skipDuplicates: true,
    });

    // POSTULACION_PROFE -> Puede ver y editar su propia ficha (BancoProfesional)
    await prisma.rolePermission.createMany({
      data: [
        {
          roleId: roles['POSTULACION_PROFE'].id,
          permissionId: perms['manage_banco_profesional'].id,
        },
      ],
      skipDuplicates: true,
    });

    // --- 1.5 DATOS BANCO PROFESIONAL ---
    console.log('📝 Configurando Tipos de Posgrado y Cargos...');
    const tipostPosgrado = [
      'Diplomado',
      'Especialidad',
      'Maestría',
      'Doctorado',
    ];
    for (const t of tipostPosgrado) {
      const existing = await prisma.bpTipoPosgrado.findFirst({
        where: { nombre: t },
      });
      if (!existing) {
        await prisma.bpTipoPosgrado.create({ data: { nombre: t } });
      }
    }

    const cargosIniciales = ['Facilitador', 'Especialista', 'Coordinador'];
    for (const c of cargosIniciales) {
      const existing = await prisma.cargo.findFirst({ where: { nombre: c } });
      if (!existing) {
        await prisma.cargo.create({ data: { nombre: c } });
      }
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
      { nombre: 'PANDO', abreviacion: 'PN' },
    ];

    for (const d of depsData) {
      console.log(`📌 Procesando: ${d.nombre}...`);

      let dep: any = await prisma.departamento.findFirst({
        where: { nombre: d.nombre },
      });
      if (!dep) {
        dep = await prisma.departamento.create({ data: d });
      }

      const sedeNombre = `SEDE CENTRAL ${d.nombre}`;
      let sede: any = await prisma.sede.findFirst({
        where: { nombre: sedeNombre },
      });
      if (!sede) {
        sede = await prisma.sede.create({
          data: {
            nombre: sedeNombre,
            descripcion: `Sede principal del departamento de ${d.nombre}`,
            horario: '08:00 - 18:30',
            turno: 'DIURNO',
            ubicacion: `Calle Principal de ${d.nombre} #123`,
            departamentoId: dep.id,
            contacto1: 70000000 + Math.floor(Math.random() * 9999999),
          },
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
        where: {
          userId_roleId_modelType: {
            userId: respUser.id,
            roleId: roles['RESPONSABLE_DEPARTAMENTAL'].id,
            modelType: 'App\\User',
          },
        },
        update: {},
        create: {
          userId: respUser.id,
          roleId: roles['RESPONSABLE_DEPARTAMENTAL'].id,
          modelType: 'App\\User',
        },
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
        where: {
          userId_roleId_modelType: {
            userId: facUser.id,
            roleId: roles['FACILITADOR'].id,
            modelType: 'App\\User',
          },
        },
        update: {},
        create: {
          userId: facUser.id,
          roleId: roles['FACILITADOR'].id,
          modelType: 'App\\User',
        },
      });

      await prisma.userSede.upsert({
        where: { userId_sedeId: { userId: facUser.id, sedeId: sede.id } },
        update: {},
        create: { userId: facUser.id, sedeId: sede.id },
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
      where: {
        userId_roleId_modelType: {
          userId: superAdmin.id,
          roleId: roles['SUPER_ADMIN'].id,
          modelType: 'App\\User',
        },
      },
      update: {},
      create: {
        userId: superAdmin.id,
        roleId: roles['SUPER_ADMIN'].id,
        modelType: 'App\\User',
      },
    });

    console.log('✅ Seeder completado con éxito.');
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
