/**
 * Seed idempotent de l'organigramme de la Région Souss-Massa.
 * Utilise upsert par code — peut être rejoué sans risque.
 * Usage : npx ts-node backend/prisma/seed-structures.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface NodeDef {
  code: string;
  libelleFr: string;
  libelleAr: string;
  type: string;
  parentCode: string | null;
}

const nodes: NodeDef[] = [
  // ── Niveau 0 ─────────────────────────────────────────────────────────────
  { code: 'PRES',           libelleFr: 'Président',                                                              libelleAr: 'الرئيس',                                    type: 'PRESIDENT',          parentCode: null },

  // ── Niveau 1 — rattachés directement au Président ─────────────────────────
  { code: 'DAP',            libelleFr: 'Direction des Affaires de la Présidence et du Conseil',                  libelleAr: 'مديرية شؤون الرئاسة والمجلس',               type: 'DIRECTION',          parentCode: 'PRES' },
  { code: 'SCAIE',          libelleFr: 'Service Contrôle, Audit Interne et Évaluation',                          libelleAr: 'مصلحة المراقبة والتدقيق الداخلي والتقييم',   type: 'SERVICE',            parentCode: 'PRES' },
  { code: 'DGS',            libelleFr: 'Direction Générale des Services',                                        libelleAr: 'المديرية العامة للمصالح',                    type: 'DIRECTION_GENERALE', parentCode: 'PRES' },

  // ── Services sous DAP ─────────────────────────────────────────────────────
  { code: 'DAP-S1',         libelleFr: 'Service Chargé des Affaires des Membres du Conseil',                     libelleAr: 'مصلحة شؤون أعضاء المجلس',                   type: 'SERVICE',            parentCode: 'DAP' },
  { code: 'DAP-S2',         libelleFr: 'Service Relations Publiques et Communication',                           libelleAr: 'مصلحة العلاقات العامة والتواصل',             type: 'SERVICE',            parentCode: 'DAP' },
  { code: 'DAP-S3',         libelleFr: 'Service Chargé des Commissions et des Groupes',                          libelleAr: 'مصلحة اللجان والمجموعات',                    type: 'SERVICE',            parentCode: 'DAP' },
  { code: 'DAP-S4',         libelleFr: 'Service de la Société Civile et des Instances Consultatives',            libelleAr: 'مصلحة المجتمع المدني والهيئات الاستشارية',   type: 'SERVICE',            parentCode: 'DAP' },

  // ── Directions sous DGS ───────────────────────────────────────────────────
  { code: 'DAES',           libelleFr: 'Direction des Affaires Économiques et Sociales',                         libelleAr: 'مديرية الشؤون الاقتصادية والاجتماعية',       type: 'DIRECTION',          parentCode: 'DGS' },
  { code: 'DGS-SJ',         libelleFr: 'Service Juridique',                                                      libelleAr: 'المصلحة القانونية',                          type: 'SERVICE',            parentCode: 'DGS' },
  { code: 'DAFTR',          libelleFr: 'Direction des Affaires Financières, Territoriales et Ressources',        libelleAr: 'مديرية الشؤون المالية والترابية والموارد',   type: 'DIRECTION',          parentCode: 'DGS' },
  { code: 'DGS-SC',         libelleFr: 'Service Coopération',                                                    libelleAr: 'مصلحة التعاون',                             type: 'SERVICE',            parentCode: 'DGS' },

  // ── Divisions sous DAES ───────────────────────────────────────────────────
  { code: 'DAES-DCSD',      libelleFr: 'Division Cohésion Sociale et Développement Solidaire',                   libelleAr: 'قسم التماسك الاجتماعي والتنمية التضامنية',   type: 'DIVISION',           parentCode: 'DAES' },
  { code: 'DAES-DDEFS',     libelleFr: 'Division Développement Économique et des Filières Stratégiques',         libelleAr: 'قسم التنمية الاقتصادية والسلاسل الاستراتيجية', type: 'DIVISION',          parentCode: 'DAES' },

  // ── Services sous DAES-DCSD ───────────────────────────────────────────────
  { code: 'DAES-DCSD-S1',   libelleFr: "Service de l'Économie Sociale et Solidaire",                             libelleAr: 'مصلحة الاقتصاد الاجتماعي والتضامني',        type: 'SERVICE',            parentCode: 'DAES-DCSD' },
  { code: 'DAES-DCSD-S2',   libelleFr: "Service de l'Inclusion Sociale",                                         libelleAr: 'مصلحة الإدماج الاجتماعي',                   type: 'SERVICE',            parentCode: 'DAES-DCSD' },
  { code: 'DAES-DCSD-S3',   libelleFr: 'Service des Activités Culturelles et Sportives',                         libelleAr: 'مصلحة الأنشطة الثقافية والرياضية',           type: 'SERVICE',            parentCode: 'DAES-DCSD' },

  // ── Services sous DAES-DDEFS ──────────────────────────────────────────────
  { code: 'DAES-DDEFS-S1',  libelleFr: 'Service de la Transformation Économique et Innovation',                  libelleAr: 'مصلحة التحول الاقتصادي والابتكار',           type: 'SERVICE',            parentCode: 'DAES-DDEFS' },
  { code: 'DAES-DDEFS-S2',  libelleFr: "Service de Soutien aux PME et Entrepreneuriat",                          libelleAr: 'مصلحة دعم المقاولات الصغيرة والمتوسطة',     type: 'SERVICE',            parentCode: 'DAES-DDEFS' },
  { code: 'DAES-DDEFS-S3',  libelleFr: 'Service de Promotion des Filières Stratégiques',                         libelleAr: 'مصلحة ترويج السلاسل الاستراتيجية',           type: 'SERVICE',            parentCode: 'DAES-DDEFS' },
  { code: 'DAES-DDEFS-S4',  libelleFr: 'Service Environnement et Énergie Renouvelable',                          libelleAr: 'مصلحة البيئة والطاقة المتجددة',              type: 'SERVICE',            parentCode: 'DAES-DDEFS' },

  // ── Divisions sous DAFTR ──────────────────────────────────────────────────
  { code: 'DAFTR-DRH',      libelleFr: 'Division des Ressources Humaines et Moyens Généraux',                    libelleAr: 'قسم الموارد البشرية والوسائل العامة',        type: 'DIVISION',           parentCode: 'DAFTR' },
  { code: 'DAFTR-DADT',     libelleFr: 'Division Aménagement et Développement Territorial',                      libelleAr: 'قسم التهيئة والتنمية الترابية',              type: 'DIVISION',           parentCode: 'DAFTR' },
  { code: 'DAFTR-DAFBP',    libelleFr: 'Division des Affaires Financières, Budget et Programmation',             libelleAr: 'قسم الشؤون المالية والميزانية والبرمجة',     type: 'DIVISION',           parentCode: 'DAFTR' },

  // ── Services sous DAFTR-DADT ──────────────────────────────────────────────
  { code: 'DAFTR-DADT-S1',  libelleFr: 'Service Travaux et Aménagement',                                         libelleAr: 'مصلحة الأشغال والتهيئة',                    type: 'SERVICE',            parentCode: 'DAFTR-DADT' },
  { code: 'DAFTR-DADT-S2',  libelleFr: 'Service de la Transformation Digitale et de la Documentation',           libelleAr: 'مصلحة التحول الرقمي والتوثيق',              type: 'SERVICE',            parentCode: 'DAFTR-DADT' },
  { code: 'DAFTR-DADT-S3',  libelleFr: "Service Planification et Ingénierie des Projets",                        libelleAr: 'مصلحة التخطيط وهندسة المشاريع',             type: 'SERVICE',            parentCode: 'DAFTR-DADT' },

  // ── Services sous DAFTR-DAFBP ─────────────────────────────────────────────
  { code: 'DAFTR-DAFBP-S1', libelleFr: 'Service de la Commande Publique',                                        libelleAr: 'مصلحة الطلبيات العمومية',                   type: 'SERVICE',            parentCode: 'DAFTR-DAFBP' },
  { code: 'DAFTR-DAFBP-S2', libelleFr: 'Service des Patrimoines et Ressources Financières',                      libelleAr: 'مصلحة الأملاك والموارد المالية',             type: 'SERVICE',            parentCode: 'DAFTR-DAFBP' },
  { code: 'DAFTR-DAFBP-S3', libelleFr: "Service Exécution Budget et Programmation",                              libelleAr: 'مصلحة تنفيذ الميزانية والبرمجة',            type: 'SERVICE',            parentCode: 'DAFTR-DAFBP' },
];

async function main() {
  console.log('🌱  Seeding structures…');

  // Première passe : upsert tous les nœuds sans parentId (on les attachera après)
  for (const node of nodes) {
    await prisma.structure.upsert({
      where: { code: node.code },
      update: { libelleFr: node.libelleFr, libelleAr: node.libelleAr, type: node.type },
      create: { code: node.code, libelleFr: node.libelleFr, libelleAr: node.libelleAr, type: node.type },
    });
  }

  // Deuxième passe : attacher les parentId maintenant que tous les nœuds existent
  for (const node of nodes) {
    if (node.parentCode === null) continue;
    const parent = await prisma.structure.findUnique({ where: { code: node.parentCode } });
    if (!parent) { console.warn(`  ⚠ Parent introuvable : ${node.parentCode}`); continue; }
    await prisma.structure.update({
      where: { code: node.code },
      data: { parentId: parent.id },
    });
  }

  const count = await prisma.structure.count();
  console.log(`✅  ${count} structures en base.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
