import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Configurando permisos de carga para Correspondencia...');

  const config = await prisma.uploadConfig.upsert({
    where: { tableName: 'correspondencia' },
    update: {
      maxSizeMB: 20,
      allowedExtensions: 'pdf,jpg,jpeg,png',
      estado: 'activo'
    },
    create: {
      tableName: 'correspondencia',
      maxSizeMB: 20,
      allowedExtensions: 'pdf,jpg,jpeg,png',
      estado: 'activo'
    }
  });

  console.log('✅ Configuración aplicada:', config);
}

main()
  .catch((e) => {
    console.error('❌ Error al configurar:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
