import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = [
    {
      tableName: 'usuarios', // Frontend user profiles
      maxSizeMB: 2.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'admins', // Legacy user profiles
      maxSizeMB: 2.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'blogs', // Frontend blogs page
      maxSizeMB: 5.0,
      allowedExtensions: 'jpg,jpeg,png,webp,gif',
    },
    {
      tableName: 'blog', // Singular version
      maxSizeMB: 5.0,
      allowedExtensions: 'jpg,jpeg,png,webp,gif',
    },
    {
      tableName: 'comunicados', // Frontend announcements
      maxSizeMB: 5.0,
      allowedExtensions: 'jpg,jpeg,png,webp,pdf',
    },
    {
      tableName: 'comunicado', // Singular version
      maxSizeMB: 5.0,
      allowedExtensions: 'jpg,jpeg,png,webp,pdf',
    },
    {
      tableName: 'eventos', // Frontend events
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'evento', // Singular version
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'programa',
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'programas', // Plural version
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'programa_dos',
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'profe', // System settings / Logo
      maxSizeMB: 5.0,
      allowedExtensions: 'jpg,jpeg,png,webp,svg',
    },
    {
      tableName: 'sede', // Frontend sedes
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'galeria', // Frontend galleries
      maxSizeMB: 15.0,
      allowedExtensions: 'jpg,jpeg,png,webp',
    },
    {
      tableName: 'mod_entrega', // Task submissions
      maxSizeMB: 30.0,
      allowedExtensions: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,zip,rar',
    },
    {
      tableName: 'mod_recurso', // Course materials
      maxSizeMB: 100.0,
      allowedExtensions:
        'pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar,mp4,mp3,jpg,jpeg,png',
    },
    {
      tableName: 'mod_foro_post',
      maxSizeMB: 10.0,
      allowedExtensions: 'jpg,jpeg,png,pdf,zip',
    },
    {
      tableName: 'bp_posgrado', // Professional bank docs
      maxSizeMB: 10.0,
      allowedExtensions: 'pdf,jpg,jpeg,png',
    },
    {
      tableName: 'banco_profesional', // Generic registration docs
      maxSizeMB: 10.0,
      allowedExtensions: 'pdf,jpg,jpeg,png',
    },
  ];

  console.log('Seed started: UploadConfig');

  for (const config of configs) {
    await prisma.uploadConfig.upsert({
      where: { tableName: config.tableName },
      update: {},
      create: {
        ...config,
        estado: 'activo',
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
