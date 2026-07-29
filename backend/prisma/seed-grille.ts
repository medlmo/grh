/**
 * Seed : Corps et Cadres par défaut
 * Idempotent — utilise upsert sur le code unique.
 * Usage : npx ts-node backend/prisma/seed-grille.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CADRES = [
  { code: 'ING-ARCH', libelleFr: 'Ingénieurs et architectes',  libelleAr: 'المهندسون والمعماريون' },
  { code: 'ADMIN',    libelleFr: 'Administrateurs',            libelleAr: 'الإداريون' },
  { code: 'TECH',     libelleFr: 'Techniciens',                libelleAr: 'التقنيون' },
  { code: 'REDACT',   libelleFr: 'Rédacteurs',                 libelleAr: 'المحررون' },
  { code: 'ADJ-ADM',  libelleFr: 'Adjoints administratifs',   libelleAr: 'المساعدون الإداريون' },
  { code: 'ADJ-TECH', libelleFr: 'Adjoints techniques',        libelleAr: 'المساعدون التقنيون' },
];

async function main() {
  // 1. Corps unique racine pour les CT marocaines
  const corps = await prisma.corps.upsert({
    where: { code: 'FCT' },
    update: {},
    create: {
      code:         'FCT',
      libelleFr:    'Fonctionnaires des Collectivités Territoriales',
      libelleAr:    'موظفو الجماعات الترابية',
      descriptionFr: 'Corps principal — Région Souss-Massa',
    },
  });
  console.log(`✔ Corps : ${corps.libelleFr} (id=${corps.id})`);

  // 2. Cadres
  for (const c of CADRES) {
    const cadre = await prisma.cadre.upsert({
      where: { code: c.code },
      update: { libelleFr: c.libelleFr, libelleAr: c.libelleAr },
      create: { ...c, corpsId: corps.id },
    });
    console.log(`  ✔ Cadre : ${cadre.libelleFr}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
