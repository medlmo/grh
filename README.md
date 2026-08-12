# GRH — Conseil de la Région Souss-Massa

Application web de **Gestion des Ressources Humaines** destinée aux collectivités territoriales marocaines, développée pour le Conseil de la Région Souss-Massa.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript + CSS Modules + react-i18next (FR / AR RTL) |
| Backend | NestJS + TypeScript + Prisma ORM |
| Base de données | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) + RBAC |
| Conteneurisation | Docker Compose |

---

## Fonctionnalités

### Dossier administratif agent
- Identité, situation familiale, coordonnées
- Affectation organisationnelle (structure hiérarchique)
- Positionnement grille : Corps → Cadre → Grade → Échelon
- Historique de carrière, diplômes, pièces jointes
- Calcul automatique de l'ancienneté

### Gestion des congés
- Types : annuel, maladie (courte / moyenne / longue durée), maternité, paternité, sans solde, autorisation d'absence, exceptionnel
- Workflow de validation hiérarchique multi-niveaux (N1 → N2 → DRH)
- Solde calculé selon l'ancienneté et le statut
- Calendrier collectif des absences
- Date de retour exclusive du décompte des jours ouvrables

### Paramétrage
- Informations de la collectivité
- Organigramme des structures (arbre illimité)
- Grille hiérarchique : Corps / Cadres / Grades / Échelons (CRUD complet)
- Jours fériés (fixes + mobiles)

### Administration
- Gestion des comptes utilisateurs (6 rôles : ADMIN, DRH, DIRECTEUR_GENERAL, PRESIDENT, CHEF_DIVISION, CHEF_SERVICE, AGENT)
- Dashboard avec KPIs (effectifs, répartition statuts, congés en cours)

---

## Démarrage rapide

### Avec Docker (recommandé)

```bash
git clone https://github.com/medlmo/grh.git
cd grh
cp backend/.env.example backend/.env   # ajuster si besoin
docker compose up --build
```

L'application sera disponible sur :
- **Frontend** → http://localhost:5173
- **API** → http://localhost:4000/api

Puis initialiser la base de données :

```bash
docker compose exec backend npx ts-node prisma/seed.ts
docker compose exec backend npx ts-node prisma/seed-structures.ts
docker compose exec backend npx ts-node prisma/seed-grille.ts
```

### Sans Docker (développement local)

**Prérequis** : Node.js 20+, PostgreSQL 16

```bash
# Backend
cd backend
cp .env.example .env        # renseigner DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npx ts-node prisma/seed-structures.ts
npx ts-node prisma/seed-grille.ts
npm run build
npm run start:prod

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@region.ma | Admin123! |
| DRH | drh@region.ma | Drh12345! |
| Directeur Général | dg@region.ma | Dg123456! |
| Chef de Division | chef@region.ma | Chef1234! |
| Agent | agent@region.ma | Agent123! |

> ⚠️ Changer tous les mots de passe et le `JWT_SECRET` avant toute mise en production.

---

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `JWT_SECRET` | Secret de signature des tokens JWT |
| `JWT_ACCESS_EXPIRES` | Durée de vie du token d'accès (ex. `15m`) |
| `JWT_REFRESH_EXPIRES` | Durée de vie du refresh token (ex. `7d`) |
| `PORT` | Port d'écoute du backend (défaut : `4000`) |
| `CORS_ORIGIN` | Origine autorisée par CORS |

---

## Structure du projet

```
grh/
├── backend/                  # API NestJS
│   ├── prisma/               # Schéma, migrations, seeds
│   └── src/
│       ├── agents/           # Dossiers agents
│       ├── auth/             # Authentification JWT
│       ├── conges/           # Module congés & absences
│       ├── dashboard/        # KPIs
│       ├── decisions/        # Actes administratifs
│       ├── parametrage/      # Configuration (grille, structures, fériés)
│       └── utilisateurs/     # Comptes utilisateurs
├── frontend/                 # Application React
│   └── src/
│       ├── components/       # Composants réutilisables
│       ├── pages/            # Pages principales
│       ├── contexts/         # Auth, Notifications
│       ├── i18n/             # Traductions FR / AR
│       └── utils/            # Helpers métier
└── docker-compose.yml
```

---

## Licence

Usage interne — Conseil de la Région Souss-Massa.
