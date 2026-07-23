# MyActivities

Application mobile multiplateforme (iOS, Android, Web) de découverte, de planification et d'évaluation d'activités locales.

[![Backend](https://github.com/CharlesDESC/MyActivities/actions/workflows/backend.yml/badge.svg)](https://github.com/CharlesDESC/MyActivities/actions/workflows/backend.yml)
[![Mobile](https://github.com/CharlesDESC/MyActivities/actions/workflows/mobile.yml/badge.svg)](https://github.com/CharlesDESC/MyActivities/actions/workflows/mobile.yml)

> Projet de certification **RNCP 39583 — Expert en Développement Logiciel (Bac+5)**.
> Développement individuel : conception, réalisation, tests et déploiement.

---

## Sommaire

- [Contexte](#contexte)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [API](#api)
- [Tests](#tests)
- [CI/CD](#cicd)
- [Sécurité et RGPD](#sécurité-et-rgpd)
- [Structure du dépôt](#structure-du-dépôt)

---

## Contexte

Trouver une activité à faire près de chez soi impose aujourd'hui de croiser plusieurs sources :
réseaux sociaux, sites d'offices de tourisme, bouche-à-oreille. L'information est dispersée,
rarement à jour, et le budget réel est souvent absent.

MyActivities centralise ces informations dans une application unique : découverte géolocalisée,
budget affiché, avis de la communauté, et planification personnelle.

**Quatre rôles utilisateurs :**

| Rôle | Périmètre |
|------|-----------|
| Visiteur | Consultation du catalogue et de la carte, sans compte |
| Membre | Planning personnel, avis, messagerie, gestion d'amis |
| Organisateur | Création et gestion de ses activités, tableau de bord de statistiques |
| Administrateur | Modération des activités, gestion des utilisateurs, journal d'audit |

## Fonctionnalités

- **Découverte géolocalisée** — recherche d'activités autour d'une position, filtres par catégorie
  (sport, culture, gastronomie, nature, bien-être, art, musique) et par budget
- **Carte interactive** — affichage des établissements et de leurs activités, géocodage des adresses
  via l'API IGN
- **Planning personnel** — ajout d'un créneau d'activité à son agenda
- **Avis et notes** — un avis unique par utilisateur et par activité, conditionné à un ajout au planning
- **Messagerie temps réel** — conversations individuelles et de groupe via WebSocket, compteur de
  messages non lus
- **Réseau social léger** — demandes d'amis, liste de contacts
- **Espace organisateur** — création et édition d'activités, créneaux, statistiques de consultation
- **Administration** — validation des activités soumises, modération, journal d'audit
- **Authentification complète** — inscription, vérification d'email, mot de passe oublié,
  réinitialisation

## Stack technique

### Backend

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Runtime | Node.js 20 | LTS, écosystème mature, TypeScript natif via ts-node |
| Framework | Express 4 | Léger, non-opiniâtre, adapté à une API REST maîtrisée de bout en bout |
| Langage | TypeScript 5 | Typage statique partagé avec le mobile, sécurité au refactoring |
| Base de données | PostgreSQL 16 + PostGIS | Requêtes géospatiales natives pour la recherche par rayon |
| Cache | Redis 7 | Mise en cache des requêtes de géolocalisation, stockage des tentatives de connexion |
| Validation | Zod | Schémas de validation partagés, inférence de types |
| Temps réel | Socket.IO | Messagerie instantanée, reconnexion automatique gérée |
| Authentification | JWT + bcrypt | Access token 15 min / refresh token 7 jours, hash bcrypt |
| Documentation | Swagger UI | Contrat d'API exposé sur `/v1/docs` |
| Sécurité HTTP | Helmet, CORS, express-rate-limit | En-têtes durcis, limitation de débit |

### Mobile

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Framework | React Native 0.86 + Expo 57 | Une base de code pour iOS, Android et Web |
| Navigation | Expo Router | Routage par fichiers, cohérent avec la structure du projet |
| Langage | TypeScript | Types partagés avec l'API |
| Cartographie | `@rnmapbox/maps` | Couche cartographique isolée pour permettre un changement de fournisseur |
| Icônes | `@expo/vector-icons` (MaterialIcons) | Rendu homogène entre plateformes, pas de dépendance aux emojis système |
| Stockage sécurisé | `expo-secure-store` | Persistance des tokens (avec repli `localStorage` sur Web) |

## Architecture

```
┌──────────────────────────┐
│   Application Expo        │  iOS · Android · Web
│   React Native + Router   │
└───────────┬───────────────┘
            │ HTTPS REST (/v1) + WebSocket
┌───────────▼───────────────┐
│   API Express (Node 20)   │
│  routes → services → db   │
│  middleware auth / erreurs│
└─────┬──────────────┬──────┘
      │              │
┌─────▼─────┐  ┌─────▼─────┐      ┌──────────────┐
│ PostgreSQL │  │   Redis   │      │  API IGN     │
│  + PostGIS │  │   cache   │      │  géocodage   │
└────────────┘  └───────────┘      └──────────────┘
```

Le backend suit une séparation stricte en couches :

- **`routes/`** — définition des endpoints, validation des entrées (Zod), aucune logique métier
- **`services/`** — logique métier et accès aux données
- **`middleware/`** — authentification JWT, gestion centralisée des erreurs, limitation de débit
- **`schemas/`** — schémas Zod de validation, source de vérité des types d'entrée
- **`realtime/`** — passerelle Socket.IO et broker de diffusion des messages
- **`lib/`** — intégrations externes (géocodage, envoi d'emails, tokens, Redis)

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker et Docker Compose (recommandé) ou PostgreSQL 16 + PostGIS et Redis 7 installés localement

### Option 1 — Docker Compose (recommandé)

Démarre l'API, PostgreSQL (avec PostGIS) et Redis d'un seul coup :

```bash
cp backend/.env.example backend/.env
docker compose up
```

L'API est disponible sur <http://localhost:3000>, la documentation sur
<http://localhost:3000/v1/docs>.

### Option 2 — Installation locale

```bash
# Backend
cd backend
cp .env.example .env          # puis renseigner DATABASE_URL et REDIS_URL
npm install
npm run migrate               # applique les migrations SQL
npm run seed                  # (optionnel) jeu de données de démonstration
npm run dev                   # http://localhost:3000
```

```bash
# Application mobile
cd myActivities
npm install
npm start                     # puis « i » (iOS), « a » (Android) ou « w » (Web)
```

## Variables d'environnement

Le fichier `backend/.env.example` documente l'ensemble des variables. Les principales :

| Variable | Rôle | Défaut |
|----------|------|--------|
| `PORT` | Port d'écoute de l'API | `3000` |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | — |
| `REDIS_URL` | Chaîne de connexion Redis | — |
| `JWT_ACCESS_SECRET` | Secret de signature des access tokens | — |
| `JWT_REFRESH_SECRET` | Secret de signature des refresh tokens | — |
| `JWT_ACCESS_EXPIRES_IN` | Durée de vie de l'access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée de vie du refresh token | `7d` |
| `AUTH_RATE_LIMIT_MAX` | Tentatives de connexion avant blocage | `5` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Fenêtre de blocage en millisecondes | `900000` (15 min) |
| `CORS_ORIGIN` | Origine autorisée | `http://localhost:8081` |
| `APP_URL` | Base des liens contenus dans les emails | `http://localhost:3000` |
| `EMAIL_PROVIDER` | `smtp` ou `brevo-api` | `smtp` |
| `ACTIVITY_MODERATION_ENABLED` | Soumet les nouvelles activités à validation | `false` |

> Sans `SMTP_HOST` configuré, les liens de vérification et de réinitialisation sont simplement
> écrits dans la console — pratique en développement.

## Base de données

Le schéma est versionné sous forme de migrations SQL numérotées dans
`backend/src/db/migrations/`, appliquées séquentiellement par `npm run migrate`.

```bash
npm run migrate     # applique les migrations en attente
npm run seed        # insère un jeu de données de démonstration
```

Le modèle complet est décrit en DBML dans `backend/database.dbml` (visualisable sur
[dbdiagram.io](https://dbdiagram.io)).

Principaux domaines : utilisateurs et authentification, activités et créneaux, établissements,
planning, avis, messagerie et conversations de groupe, amitiés, journal d'audit administrateur.

## API

L'API est exposée sous le préfixe `/v1` et documentée via Swagger UI sur `/v1/docs`
(source : `backend/swagger.yaml`).

| Domaine | Base | Description |
|---------|------|-------------|
| Authentification | `/v1/auth` | Inscription, connexion, rafraîchissement, vérification d'email, réinitialisation |
| Utilisateurs | `/v1/users` | Profil, préférences |
| Activités | `/v1/activities` | Recherche, filtres, détail, CRUD organisateur |
| Établissements | `/v1/establishments` | Lieux et géocodage |
| Planning | `/v1/planning` | Agenda personnel |
| Avis | `/v1` | Notes et commentaires |
| Organisateurs | `/v1/organizers` | Tableau de bord, statistiques |
| Messagerie | `/v1/messages` | Conversations individuelles et de groupe |
| Amis | `/v1/friends` | Demandes et liste de contacts |
| Administration | `/v1/admin` | Modération, gestion des utilisateurs |
| Santé | `/health` | Sonde de disponibilité (utilisée par Render) |

## Tests

Le projet compte **37 fichiers de tests backend** (services, routes, schémas, middleware, temps réel)
et **39 fichiers de tests mobile** (écrans, hooks, contextes, client API).

```bash
# Backend — Jest + Supertest
cd backend
npm test
npm run test:coverage

# Mobile — Jest + React Native Testing Library
cd myActivities
npm test
npm run test:coverage
```

Le typage est vérifié séparément :

```bash
cd backend && npx tsc --noEmit
```

## CI/CD

Deux workflows GitHub Actions, déclenchés uniquement sur les chemins concernés :

**`backend.yml`** — sur chaque push et pull request touchant `backend/` :
1. Installation des dépendances (`npm ci`)
2. Vérification du typage (`tsc --noEmit`)
3. Exécution des tests avec couverture
4. Sur `main` uniquement : déclenchement du déploiement Render via deploy hook

**`mobile.yml`** — sur chaque push et pull request touchant `myActivities/` : lint, typage et tests.
Le workflow peut aussi être déclenché manuellement (`workflow_dispatch`) pour lancer un build EAS
en choisissant la plateforme et le profil.

Le déploiement du backend est décrit dans `render.yaml` ; l'image de production est construite à
partir de `backend/Dockerfile` (multi-stage, `node:20-alpine`).

## Sécurité et RGPD

- **Mots de passe** hachés avec bcrypt, jamais stockés ni journalisés en clair
- **Tokens JWT** à durée courte (15 min) avec rotation par refresh token (7 jours)
- **Protection contre le bruteforce** — 5 tentatives de connexion échouées entraînent un blocage de
  15 minutes, suivi côté Redis
- **Limitation de débit** globale sur l'API via `express-rate-limit`
- **En-têtes HTTP durcis** via Helmet, CORS restreint à une origine explicite
- **Validation systématique des entrées** par schémas Zod avant tout accès aux données
- **Géolocalisation** — donnée à caractère personnel au sens du RGPD : collectée uniquement après
  consentement explicite de l'utilisateur, utilisée pour le seul calcul de proximité, jamais
  historisée
- **Suppression de compte** — statut `deleted` prévu au modèle de données pour honorer le droit à
  l'effacement

## Structure du dépôt

```
.
├── .github/workflows/     # Intégration et déploiement continus
├── backend/               # API REST Node.js + Express + TypeScript
│   ├── src/
│   │   ├── __tests__/     # Tests Jest + Supertest
│   │   ├── config/        # Configuration typée issue des variables d'environnement
│   │   ├── db/            # Migrations SQL, seed, client PostgreSQL
│   │   ├── lib/           # Géocodage IGN, emails, tokens, Redis
│   │   ├── middleware/    # Authentification, erreurs, limitation de débit
│   │   ├── realtime/      # Passerelle Socket.IO
│   │   ├── routes/        # Endpoints HTTP
│   │   ├── schemas/       # Schémas de validation Zod
│   │   ├── services/      # Logique métier
│   │   └── types/         # Types partagés
│   ├── database.dbml      # Modèle de données
│   └── swagger.yaml       # Contrat d'API
├── myActivities/          # Application React Native (Expo)
│   └── src/
│       ├── app/           # Écrans (routage par fichiers Expo Router)
│       ├── components/    # Composants réutilisables
│       ├── context/       # Contextes React (authentification…)
│       ├── hooks/         # Hooks métier
│       ├── lib/           # Client API, stockage des tokens
│       └── styles/        # Feuilles de styles
├── docker-compose.yml     # Environnement de développement local
└── render.yaml            # Déploiement du backend
```

---

## Auteur

**Charles Deschamps** — [@CharlesDESC](https://github.com/CharlesDESC)

Projet réalisé dans le cadre du titre RNCP 39583 « Expert en Développement Logiciel ».

