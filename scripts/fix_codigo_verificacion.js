const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.evaluacionAdmins.findMany({
    where: { codigoVerificacion: null },
    select: {
      id: true,
      evaluado: { select: { ci: true } }
    }
  });

  console.log(`Encontrados ${records.length} registros con eva_codigo_verificacion NULL.`);

  let updatedCount = 0;
  for (const r of records) {
    const ciVal = r.evaluado?.ci ? String(r.evaluado.ci) : null;
    const code = ciVal ? `601-${ciVal}` : `601-${r.id.slice(0, 8).toUpperCase()}`;
    await prisma.evaluacionAdmins.update({
      where: { id: r.id },
      data: { codigoVerificacion: code }
    });
    updatedCount++;
  }

  console.log(`Actualizados exitosamente ${updatedCount} registros en evaluacion_admins.`);
}

main()
  .catch((e) => {
    console.error('Error actualizando:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
