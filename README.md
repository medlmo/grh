# GRH — Conseil de la Région Souss-Massa

Application web de **Gestion des Ressources Humaines** destinée au Conseil de la Région Souss-Massa, adaptable aux collectivités territoriales marocaines.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + react-i18next (FR/AR RTL) |
| Backend | NestJS (Node.js/TypeScript) + Prisma ORM |
| Base de données | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Déploiement | Docker Compose (hébergement souverain possible) |

## Modules du Lot 1 (MVP)

- **4.1 Dossier administratif de l'agent** : identité, situation familiale, corps/cadre/grade/échelle/échelon, ancienneté, diplômes, affectation, historique de carrière, pièces jointes, matricule CMR/RCAR.
- **4.3 Congés et absences** : congé annuel, maladie, maternité/paternité, sans solde, autorisations ; workflow de validation hiérarchique (agent → chef de division → directeur) ; solde calculé selon ancienneté ; calendrier des absences.
- **Fondations** : Auth JWT + RBAC (6 profils), bilinguisme FR/AR RTL, paramétrage administrable (collectivité, grilles, grades/échelons, jours fériés).

## Démarrage rapide

### Avec Docker (recommandé)

```bash
docker compose up --build
```

- Frontend : http://localhost:5173
- Backend API : http://localhost:4000/api
- Comptes de démonstration (seed) :
  - `admin@region.ma` / `Admin@123` (Administrateur système)
  - `drh@region.ma` / `Drh@123` (DRH)
  - `agent@region.ma` / `Agent@123` (Agent)

### Sans Docker (développement local)

Pré-requis : Node 20+, PostgreSQL, Redis.

```bash
# Base de données
docker compose up -d db redis

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

## Structure du projet

```
grh-souss-massa/
├── backend/          # API NestJS + Prisma
│   ├── prisma/       # Schéma, migrations, seed
│   └── src/
│       ├── auth/         # Authentification JWT + RBAC
│       ├── agents/       # Module Dossier Agent (4.1)
│       ├── conges/       # Module Congés & absences (4.3)
│       ├── decisions/    # Module Actes & décisions (4.6 - base)
│       ├── parametrage/  # Grades, échelons, fériés, collectivité
│       └── common/       # Guards, decorators, i18n, filtres
├── frontend/         # SPA React
│   └── src/
│       ├── i18n/         # Traductions FR/AR
│       ├── api/          # Client API
│       ├── components/   # UI réutilisable
│       ├── pages/        # Pages par module
│       └── routes/       # Routage + protection RBAC
└── docker-compose.yml
```

## Conformité

- **Loi 09-08** : chiffrement des données sensibles, journalisation des accès (audit trail), gestion fine des autorisations.
- **Bilinguisme** : interface FR / AR (RTL), structure prévue pour l'Amazigh.
- **Souveraineté** : déploiement Docker compatible data center marocain, aucune dépendance bloquante à un cloud étranger.
- **Paramétrabilité multi-collectivités** : nom, logo, grilles, organigramme, calendrier de fériés configurables sans toucher au code.

## Lots suivants (plan)

- **Lot 2** : Carrière/avancement (4.2), Organigramme/GPEEC (4.10), Notifications/alertes (4.13).
- **Lot 3** : Temps de travail (4.4), Recrutement/concours (4.7), Discipline (4.9), Paie/Trésorerie.
- **Lot 4** : Formation, interopérabilité API (GID/CMR/CNOPS), exports Cour des comptes/DGCT.
