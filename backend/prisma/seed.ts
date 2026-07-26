import { PrismaClient, Role, StatutAgent } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: début...');

  // --- Collectivité ---
  await prisma.collectivite.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nomFr: 'Région Souss-Massa',
      nomAr: 'جهة سوس ماسة',
      enteteFr: "Royaume du Maroc — Ministère de l'Intérieur — Région Souss-Massa",
      enteteAr: 'المملكة المغربية — وزارة الداخلية — جهة سوس ماسة',
      adresse: 'Avenue Mohammed V, Agadir',
      telephone: '+212 528 00 00 00',
      email: 'contact@region.soussmassa.ma',
    },
  });

  // --- Structure organisationnelle ---
  const directionRh = await prisma.structure.upsert({
    where: { code: 'DRH' },
    update: {},
    create: {
      code: 'DRH',
      libelleFr: 'Direction des Ressources Humaines',
      libelleAr: 'مديرية الموارد البشرية',
      type: 'DIRECTION',
    },
  });

  const divisionGestion = await prisma.structure.upsert({
    where: { code: 'DIV-GEST' },
    update: {},
    create: {
      code: 'DIV-GEST',
      libelleFr: 'Division de la Gestion des Carrières',
      libelleAr: 'قسم تسيير المسارات المهنية',
      type: 'DIVISION',
      parentId: directionRh.id,
    },
  });

  const directionFin = await prisma.structure.upsert({
    where: { code: 'DF' },
    update: {},
    create: {
      code: 'DF',
      libelleFr: 'Direction des Finances',
      libelleAr: 'مديرية المالية',
      type: 'DIRECTION',
    },
  });

  // --- Corps / Cadres / Grades / Échelons ---
  const corpsAdm = await prisma.corps.upsert({
    where: { code: 'CORPS-ADMIN' },
    update: {},
    create: { code: 'CORPS-ADMIN', libelleFr: 'Corps des Administrateurs', libelleAr: 'هيئة الموظفين الإداريين' },
  });

  const cadreSuperieur = await prisma.cadre.upsert({
    where: { code: 'CADRE-SUP' },
    update: {},
    create: {
      code: 'CADRE-SUP',
      libelleFr: 'Cadre Supérieur',
      libelleAr: 'الإطار العالي',
      corpsId: corpsAdm.id,
    },
  });

  const gradeIng = await prisma.grade.upsert({
    where: { code: 'GR-ING' },
    update: {},
    create: {
      code: 'GR-ING',
      libelleFr: 'Ingénieur',
      libelleAr: 'مهندس',
      cadreId: cadreSuperieur.id,
    },
  });

  const gradeTech = await prisma.grade.upsert({
    where: { code: 'GR-TECH' },
    update: {},
    create: {
      code: 'GR-TECH',
      libelleFr: 'Technicien',
      libelleAr: 'تقني',
      cadreId: cadreSuperieur.id,
    },
  });

  // Échelles associées aux grades (une échelle par grade pour le seed)
  const echelleIng = await prisma.echelle.upsert({
    where: { gradeId_numero: { gradeId: gradeIng.id, numero: 11 } },
    update: {},
    create: {
      code: 'ECH-ING',
      numero: 11,
      libelleFr: 'Échelle 11',
      libelleAr: 'السلم 11',
      gradeId: gradeIng.id,
    },
  });

  const echelleTech = await prisma.echelle.upsert({
    where: { gradeId_numero: { gradeId: gradeTech.id, numero: 9 } },
    update: {},
    create: {
      code: 'ECH-TECH',
      numero: 9,
      libelleFr: 'Échelle 9',
      libelleAr: 'السلم 9',
      gradeId: gradeTech.id,
    },
  });

  // Échelons pour l'échelle du grade Ingénieur (indices indicatifs)
  for (const e of [
    { n: 1, i: 320, d: 24 },
    { n: 2, i: 380, d: 24 },
    { n: 3, i: 440, d: 24 },
    { n: 4, i: 500, d: 24 },
    { n: 5, i: 560, d: 36 },
  ]) {
    await prisma.echelon.upsert({
      where: { echelleId_numero: { echelleId: echelleIng.id, numero: e.n } },
      update: {},
      create: { echelleId: echelleIng.id, numero: e.n, indice: e.i, dureeMinMois: e.d },
    });
  }

  // Échelons pour l'échelle du grade Technicien
  for (const e of [
    { n: 1, i: 220, d: 24 },
    { n: 2, i: 260, d: 24 },
    { n: 3, i: 300, d: 36 },
  ]) {
    await prisma.echelon.upsert({
      where: { echelleId_numero: { echelleId: echelleTech.id, numero: e.n } },
      update: {},
      create: { echelleId: echelleTech.id, numero: e.n, indice: e.i, dureeMinMois: e.d },
    });
  }

  // --- Jours fériés 2026 ---
  const feries = [
    { fr: 'Jour de l\'An', ar: 'رأس السنة الميلادية', date: '2026-01-01', mobile: false },
    { fr: 'Manifeste de l\'Indépendance', ar: 'عيد تقديم وثيقة الاستقلال', date: '2026-01-11', mobile: false },
    { fr: 'Fête du Travail', ar: 'عيد الشغل', date: '2026-05-01', mobile: false },
    { fr: 'Fête du Trône', ar: 'عيد العرش', date: '2026-07-30', mobile: false },
    { fr: 'Allégeance Oued Eddahab', ar: 'عيد استرجاع وادي الذهب', date: '2026-08-14', mobile: false },
    { fr: 'Révolution du Roi et du Peuple', ar: 'ثورة الملك والشعب', date: '2026-08-20', mobile: false },
    { fr: 'Fête de la Jeunesse', ar: 'عيد الشباب', date: '2026-08-21', mobile: false },
    { fr: 'Marche Verte', ar: 'المسيرة الخضراء', date: '2026-11-06', mobile: false },
    { fr: 'Fête de l\'Indépendance', ar: 'عيد الاستقلال', date: '2026-11-18', mobile: false },
    // Mobiles (hégire) — dates approximatives 2026
    { fr: 'Aïd al-Fitr', ar: 'عيد الفطر', date: '2026-03-20', mobile: true },
    { fr: 'Aïd al-Adha', ar: 'عيد الأضحى', date: '2026-05-27', mobile: true },
    { fr: 'Achoura', ar: 'عاشوراء', date: '2026-06-28', mobile: true },
    { fr: 'Mawlid', ar: 'المولد النبوي', date: '2026-08-25', mobile: true },
  ];
  for (const f of feries) {
    await prisma.jourFerie.upsert({
      where: { date: new Date(f.date) },
      update: {},
      create: { libelleFr: f.fr, libelleAr: f.ar, date: new Date(f.date), estMobile: f.mobile },
    });
  }

  // --- Types de congé ---
  const typesConge = [
    { type: 'ANNUEL', fr: 'Congé annuel', ar: 'العطلة السنوية', max: 22, solde: true, justif: false },
    { type: 'MALADIE_COURTE', fr: 'Congé de maladie (courte durée)', ar: 'عطلة المرض (قصيرة الأمد)', max: 180, solde: false, justif: true },
    { type: 'MALADIE_MOYENNE', fr: 'Congé de maladie (moyenne durée)', ar: 'عطلة المرض (متوسطة الأمد)', max: 1095, solde: false, justif: true },
    { type: 'MALADIE_LONGUE', fr: 'Congé de maladie (longue durée)', ar: 'عطلة المرض (طويلة الأمد)', max: 1825, solde: false, justif: true },
    { type: 'MATERNITE', fr: 'Congé de maternité', ar: 'عطلة الأمومة', max: 98, solde: false, justif: true },
    { type: 'PATERNITE', fr: 'Congé de paternité', ar: 'عطلة الأبوة', max: 15, solde: false, justif: true },
    { type: 'SANS_SOLDE', fr: 'Congé sans solde', ar: 'عطلة بدون أجر', max: 30, solde: false, justif: false },
    { type: 'AUTORISATION_ABSENCE', fr: 'Autorisation d\'absence', ar: 'إذن بالغياب', max: 3, solde: false, justif: false },
    { type: 'EXCEPTIONNEL', fr: 'Congé exceptionnel', ar: 'عطلة استثنائية', max: 10, solde: false, justif: false },
  ];
  for (const t of typesConge) {
    await prisma.typeCongeConfig.upsert({
      where: { type: t.type as any },
      update: {},
      create: {
        type: t.type as any,
        libelleFr: t.fr,
        libelleAr: t.ar,
        dureeMaxJours: t.max,
        avecSolde: t.solde,
        justificatifRequis: t.justif,
      },
    });
  }

  // --- Agents + Utilisateurs ---
  const pwd = async (p: string) => bcrypt.hash(p, 10);

  // Agent 1 : DRH (chef)
  const agentDrh = await prisma.agent.upsert({
    where: { matricule: 'AG-001' },
    update: {},
    create: {
      matricule: 'AG-001',
      cin: 'AB123456',
      nomFr: 'Alaoui',
      nomAr: 'علوي',
      prenomFr: 'Mohammed',
      prenomAr: 'محمد',
      dateNaissance: new Date('1975-03-15'),
      lieuNaissanceFr: 'Agadir',
      sexe: 'M',
      nationalite: 'Marocaine',
      situationFamiliale: 'MARIE',
      nbEnfants: 3,
      telephone: '+212661111111',
      email: 'drh@region.ma',
      statut: StatutAgent.TITULAIRE,
      dateRecrutement: new Date('2000-09-01'),
      dateTitularisation: new Date('2001-09-01'),
      corpsId: corpsAdm.id,
      cadreId: cadreSuperieur.id,
      gradeId: gradeIng.id,
      echelleId: echelleIng.id,
      echelonId: (await prisma.echelon.findFirst({ where: { echelleId: echelleIng.id, numero: 4 } }))!.id,
      indice: 500,
      caisseRetraite: 'CMR',
      matriculeRetraite: 'CMR-001',
      structureId: directionRh.id,
      fonctionFr: 'Directeur des Ressources Humaines',
      fonctionAr: 'مدير الموارد البشرية',
    },
  });

  // Agent 2 : Chef de division
  const agentChef = await prisma.agent.upsert({
    where: { matricule: 'AG-002' },
    update: {},
    create: {
      matricule: 'AG-002',
      cin: 'CD789012',
      nomFr: 'Bennani',
      nomAr: 'بناني',
      prenomFr: 'Fatima',
      prenomAr: 'فاطمة',
      dateNaissance: new Date('1980-06-20'),
      lieuNaissanceFr: 'Inezgane',
      sexe: 'F',
      nationalite: 'Marocaine',
      situationFamiliale: 'MARIE',
      nbEnfants: 2,
      telephone: '+212662222222',
      email: 'chef@region.ma',
      statut: StatutAgent.TITULAIRE,
      dateRecrutement: new Date('2005-01-10'),
      dateTitularisation: new Date('2006-01-10'),
      corpsId: corpsAdm.id,
      cadreId: cadreSuperieur.id,
      gradeId: gradeIng.id,
      echelleId: echelleIng.id,
      echelonId: (await prisma.echelon.findFirst({ where: { echelleId: echelleIng.id, numero: 3 } }))!.id,
      indice: 440,
      caisseRetraite: 'CMR',
      matriculeRetraite: 'CMR-002',
      structureId: divisionGestion.id,
      fonctionFr: 'Chef de Division',
      fonctionAr: 'رئيس قسم',
    },
  });

  // Agent 3 : Agent simple
  const agentSimple = await prisma.agent.upsert({
    where: { matricule: 'AG-003' },
    update: {},
    create: {
      matricule: 'AG-003',
      cin: 'EF345678',
      nomFr: 'Chraibi',
      nomAr: 'الشرايفي',
      prenomFr: 'Youssef',
      prenomAr: 'يوسف',
      dateNaissance: new Date('1990-11-05'),
      lieuNaissanceFr: 'Taroudant',
      sexe: 'M',
      nationalite: 'Marocaine',
      situationFamiliale: 'CELIBATAIRE',
      telephone: '+212663333333',
      email: 'agent@region.ma',
      statut: StatutAgent.TITULAIRE,
      dateRecrutement: new Date('2015-03-01'),
      dateTitularisation: new Date('2016-03-01'),
      corpsId: corpsAdm.id,
      cadreId: cadreSuperieur.id,
      gradeId: gradeTech.id,
      echelleId: echelleTech.id,
      echelonId: (await prisma.echelon.findFirst({ where: { echelleId: echelleTech.id, numero: 2 } }))!.id,
      indice: 300,
      caisseRetraite: 'RCAR',
      matriculeRetraite: 'RCAR-003',
      structureId: divisionGestion.id,
      fonctionFr: 'Technicien',
      fonctionAr: 'تقني',
    },
  });

  // Agent 1bis : Directeur Général
  const agentDg = await prisma.agent.upsert({
    where: { matricule: 'AG-000' },
    update: {},
    create: {
      matricule: 'AG-000',
      cin: 'DG123456',
      nomFr: 'Idrissi',
      nomAr: 'إدريسي',
      prenomFr: 'Karim',
      prenomAr: 'كريم',
      dateNaissance: new Date('1970-01-10'),
      lieuNaissanceFr: 'Agadir',
      sexe: 'M',
      nationalite: 'Marocaine',
      situationFamiliale: 'MARIE',
      nbEnfants: 4,
      telephone: '+212660000000',
      email: 'dg@region.ma',
      statut: StatutAgent.TITULAIRE,
      dateRecrutement: new Date('1995-04-01'),
      dateTitularisation: new Date('1996-04-01'),
      corpsId: corpsAdm.id,
      cadreId: cadreSuperieur.id,
      gradeId: gradeIng.id,
      echelleId: echelleIng.id,
      echelonId: (await prisma.echelon.findFirst({ where: { echelleId: echelleIng.id, numero: 5 } }))!.id,
      indice: 560,
      caisseRetraite: 'CMR',
      matriculeRetraite: 'CMR-000',
      structureId: directionRh.id,
      fonctionFr: 'Directeur Général des Services',
      fonctionAr: 'المدير العام للخدمات',
    },
  });

  // Soldes de congé : Art. 40 du Dahir 1-58-008 : 22 jours ouvrables/an
  for (const a of [agentDrh, agentChef, agentSimple, agentDg]) {
    const droits = 22; // Base légale : 22 jours ouvrables
    await prisma.soldeConge.upsert({
      where: { agentId: a.id },
      update: {},
      create: { agentId: a.id, droitsAnnuels: droits, soldeReporte: 5, prisExercice: 0, exercice: 2026 },
    });
  }

  // --- Utilisateurs ---
  const users = [
    { email: 'admin@region.ma', pwd: 'Admin@123', role: Role.ADMIN, agentId: null },
    { email: 'dg@region.ma', pwd: 'Dg@123', role: Role.DIRECTEUR_GENERAL, agentId: agentDg.id },
    { email: 'drh@region.ma', pwd: 'Drh@123', role: Role.DRH, agentId: agentDrh.id },
    { email: 'chef@region.ma', pwd: 'Chef@123', role: Role.CHEF_DIVISION, agentId: agentChef.id },
    { email: 'agent@region.ma', pwd: 'Agent@123', role: Role.AGENT, agentId: agentSimple.id },
  ];
  for (const u of users) {
    await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        motDePasse: await pwd(u.pwd),
        role: u.role,
        agentId: u.agentId,
      },
    });
  }

  // --- Historique de carrière (exemple) ---
  await prisma.carriereHistorique.create({
    data: {
      agentId: agentSimple.id,
      dateEffet: new Date('2015-03-01'),
      evenement: 'RECRUTEMENT',
      descriptionFr: 'Recrutement par contrat',
      echelonAvant: null,
      echelonApres: 1,
    },
  }).catch(() => {});
  await prisma.carriereHistorique.create({
    data: {
      agentId: agentSimple.id,
      dateEffet: new Date('2016-03-01'),
      evenement: 'TITULARISATION',
      descriptionFr: 'Titularisation après stage',
      echelonAvant: 1,
      echelonApres: 1,
    },
  }).catch(() => {});

  // --- Diplôme exemple ---
  await prisma.diplome.create({
    data: {
      agentId: agentSimple.id,
      intituleFr: 'Licence en Gestion',
      intituleAr: 'إجازة في التدبير',
      etablissement: 'Université Ibn Zohr',
      anneeObtention: 2014,
    },
  }).catch(() => {});

  console.log('Seed: terminé avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
