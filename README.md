# MyActivities

Application de découverte, de planification et d’évaluation d’activités locales, composée d’une API REST, d’une application Expo et d’un back-office web.

[![Backend](https://github.com/CharlesDESC/MyActivities/actions/workflows/backend.yml/badge.svg)](https://github.com/CharlesDESC/MyActivities/actions/workflows/backend.yml)
[![Mobile](https://github.com/CharlesDESC/MyActivities/actions/workflows/mobile.yml/badge.svg)](https://github.com/CharlesDESC/MyActivities/actions/workflows/mobile.yml)

> Projet individuel réalisé pour la certification **RNCP 39583 — Expert en Développement Logiciel (Bac+5)** : conception, développement, tests, sécurité, accessibilité, intégration continue et déploiement.

## État de la version

| Élément | État de `v0.9.1` |
|---|---|
| Version remise | [`v0.9.1`](https://github.com/CharlesDESC/MyActivities/tree/v0.9.1) |
| Commit qualifié | `65c56e8849cc7c69d6581f3eaf3bb1d2f67792de` |
| Backend | Déployé sur Render |
| Documentation API | Swagger disponible publiquement |
| Base et cache distants | PostgreSQL et Valkey/Redis sur Render |
| Mobile | Expo Go et soumission EAS Android `preview` |
| Back-office web | Fonctionnel localement avec Expo Web |
| Tests qualifiés | 491 backend et 299 mobile, sans échec |
| Audit des dépendances de production | 0 vulnérabilité backend et client |
| Publication en store | Non réalisée |

`v0.9.1` est un prototype fonctionnel destiné à la démonstration et à l’évaluation. Cette correction ferme les risques liés au JSON malformé, au compteur de tentatives de connexion, à la vérification du SIRET et aux contrôles d’accessibilité retenus. Le numéro majeur reste à zéro car le binaire Android final, iOS, le déploiement public du back-office et les stores ne sont pas encore qualifiés.

## Liens utiles

- API : <https://myactivities-back.onrender.com>
- Santé : <https://myactivities-back.onrender.com/health>
- Swagger : <https://myactivities-back.onrender.com/v1/docs/>
- Projet Expo : <https://expo.dev/accounts/charly_des/projects/myActivities>
- Workflows GitHub : <https://github.com/CharlesDESC/MyActivities/actions>

L’hébergement Render utilise une offre de démonstration. La première requête peut être plus lente si le service doit sortir de veille.

## Fonctionnalités

### Visiteur et membre

- inscription, vérification d’email, connexion et réinitialisation du mot de passe ;
- catalogue, recherche et filtres par catégorie, budget et proximité ;
- géolocalisation, carte et géocodage des adresses via l’API IGN ;
- consultation des activités et de leurs créneaux ;
- ajout et retrait d’un créneau dans le planning personnel ;
- avis et notation ;
- demandes d’amis et liste de contacts ;
- messagerie individuelle ou de groupe en temps réel.

### Organisateur

- gestion d’un établissement ;
- création, modification et suppression d’activités ;
- gestion des créneaux ;
- consultation des réservations ;
- tableau de bord et statistiques.

### Administration

L’API expose les opérations de gestion des utilisateurs, des rôles, des suspensions et de modération des activités. Dans la configuration MVP remise, `ACTIVITY_MODERATION_ENABLED=false` autorise la publication immédiate des activités. Une activation de la modération nécessite de recetter le parcours administrateur complet.

## Stack technique

### Backend

| Domaine | Technologie |
|---|---|
| Runtime et langage | Node.js 20, TypeScript 5 |
| API | Express 4 |
| Validation | Zod |
| Données | PostgreSQL 16, PostGIS 3.4 |
| Cache et diffusion | Redis 7 en local, Valkey/Redis sur Render |
| Temps réel | Socket.IO |
| Authentification | JWT, refresh tokens opaques, bcrypt |
| Sécurité HTTP | Helmet, CORS, `express-rate-limit` |
| Documentation | OpenAPI 3 et Swagger UI |
| Tests | Jest et Supertest |

### Client

| Domaine | Technologie |
|---|---|
| Framework | Expo 57, React Native 0.86, React 19 |
| Navigation | Expo Router |
| Langage | TypeScript |
| Cartographie | `@rnmapbox/maps`, WebView et image statique de repli |
| Stockage des tokens | `expo-secure-store` |
| Tests | Jest Expo et React Native Testing Library |
| Build Android | EAS Build |

### Exploitation

| Domaine | Technologie |
|---|---|
| Environnement local | Docker Compose |
| Intégration continue | GitHub Actions |
| Backend distant | Render et image Docker multi-stage |
| Mobile distant | Expo EAS Build |
| Performance | k6 |

## Architecture

```text
┌──────────────────────────────┐
│ Application Expo             │
│ Android · iOS · Web          │
└──────────────┬───────────────┘
               │ HTTPS REST /v1 et WebSocket
┌──────────────▼───────────────┐
│ API Express / TypeScript     │
│ routes → services → données  │
│ auth · validation · erreurs  │
└─────────┬───────────┬────────┘
          │           │
┌─────────▼──────┐ ┌──▼──────────────┐
│ PostgreSQL     │ │ Redis / Valkey   │
│ et PostGIS     │ │ cache et broker  │
└────────────────┘ └─────────────────┘
          │
┌─────────▼──────────┐
│ Services externes  │
│ IGN · SMTP · Mapbox│
└────────────────────┘
```

Le backend suit une architecture en couches :

- `routes/` : endpoints HTTP et validation des entrées ;
- `services/` : règles métier et accès aux données ;
- `schemas/` : schémas Zod et types d’entrée ;
- `middleware/` : authentification, autorisation, erreurs et limitation de débit ;
- `realtime/` : passerelle Socket.IO ;
- `lib/` : emails, géocodage, Redis et gestion des tokens ;
- `db/` : client PostgreSQL, migrations et données de démonstration.

Le client sépare les écrans Expo Router, les composants, les contextes, les hooks métier, le client API et les adaptateurs techniques.

## Démarrage rapide avec Docker

### Prérequis

- Git ;
- Docker Desktop avec Docker Compose v2 ;
- Node.js 20 et npm pour le client Expo.

### 1. Récupérer la version

```powershell
git clone https://github.com/CharlesDESC/MyActivities.git
Set-Location MyActivities
git fetch --tags
git checkout v0.9.1
```

Pour travailler sur la branche courante plutôt que sur la version remise, remplacer la dernière commande par `git checkout main`.

### 2. Démarrer l’API, PostgreSQL et Redis

Sous PowerShell :

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up -d --build
docker compose ps
```

Sous Bash :

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
docker compose ps
```

Docker Compose configure automatiquement les connexions internes de PostgreSQL et Redis. Le fichier `backend/.env` reste utile pour les paramètres locaux optionnels, notamment SMTP.

Vérifications :

```powershell
curl.exe -sS http://localhost:3000/health
curl.exe -sS -o NUL -w "%{http_code}" http://localhost:3000/v1/docs/
```

Services locaux :

| Service | Adresse |
|---|---|
| API | <http://localhost:3000> |
| Swagger | <http://localhost:3000/v1/docs/> |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

Les migrations sont appliquées au démarrage du backend. Pour charger le jeu de démonstration :

```powershell
docker compose exec backend npm run seed
```

Pour arrêter les conteneurs en conservant les données :

```powershell
docker compose down
```

`docker compose down --volumes` supprime les volumes locaux et ne doit être utilisé que pour une réinitialisation volontaire.

## Démarrage de l’application Expo

```powershell
Set-Location myActivities
Copy-Item .env.example .env
npm ci
npm start
```

Sous Bash, utiliser `cp .env.example .env`.

Configurer `myActivities/.env` sans y placer de valeur destinée au dépôt :

| Variable | Usage | Sensibilité |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Base de l’API avec le suffixe `/v1` | Publique dans le client |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Affichage des cartes | Jeton public |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | Téléchargement du SDK pour un build natif | Secret |

URL de l’API selon le client :

| Client | URL |
|---|---|
| Expo Web | `http://localhost:3000/v1` |
| Émulateur Android | `http://10.0.2.2:3000/v1` |
| Téléphone sur le réseau local | IPv4 du poste suivie de `:3000/v1` |
| API distante du prototype | `https://myactivities-back.onrender.com/v1` |

Le projet prend en charge un repli cartographique dans Expo Go. Le module Mapbox natif nécessite un build de développement ou EAS.

Commandes disponibles :

```powershell
npm start
npm run android
npm run ios
npm run web
```

La commande iOS nécessite un environnement Apple adapté. Cette cible est prévue par le code mais n’a pas été qualifiée dans la version `v0.9.1`.

## Installation sans Docker

PostgreSQL avec PostGIS et Redis doivent être disponibles localement. Après avoir adapté `backend/.env` :

```powershell
Set-Location backend
npm ci
npm run migrate
npm run seed
npm run dev
```

Le seed est facultatif. Les migrations SQL sont versionnées dans `backend/src/db/migrations/`.

## Variables du backend

Le fichier `backend/.env.example` constitue la référence.

| Variable | Rôle | Valeur locale habituelle |
|---|---|---|
| `PORT` | Port de l’API | `3000` |
| `NODE_ENV` | Environnement | `development` |
| `TRUST_PROXY_HOPS` | Nombre de proxies approuvés | `0` en local, `1` sur Render |
| `DATABASE_URL` | Connexion PostgreSQL | Configurée par l’environnement |
| `REDIS_URL` | Connexion Redis | Configurée par l’environnement |
| `JWT_ACCESS_SECRET` | Signature des access tokens | Secret obligatoire |
| `JWT_REFRESH_SECRET` | Signature des refresh tokens | Secret distinct obligatoire |
| `JWT_ACCESS_EXPIRES_IN` | Durée de l’access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée du refresh token | `7d` |
| `AUTH_RATE_LIMIT_MAX` | Seuil d’authentification | `5` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Fenêtre du limiteur | `900000` |
| `CORS_ORIGIN` | Origine web autorisée | `http://localhost:8081` |
| `APP_URL` | Base des liens envoyés par email | `http://localhost:3000` |
| `EMAIL_PROVIDER` | `smtp` ou `brevo-api` | `smtp` |
| `ACTIVITY_MODERATION_ENABLED` | Validation préalable des activités | `false` pour le MVP |

Sans serveur SMTP en développement, les liens de vérification et de réinitialisation sont écrits dans les journaux du backend.

Les fichiers `.env` sont ignorés par Git. Aucun secret ne doit être placé dans une variable `EXPO_PUBLIC_`, une capture, un commit ou la documentation.

## API

L’API est exposée sous `/v1`. Son contrat OpenAPI est défini dans `backend/swagger.yaml`.

| Domaine | Routes principales |
|---|---|
| Authentification | `/v1/auth` |
| Utilisateurs | `/v1/users` |
| Activités | `/v1/activities` |
| Établissements | `/v1/establishments` |
| Planning | `/v1/planning` |
| Avis | `/v1/activities/:activityId/reviews` |
| Organisateurs | `/v1/organizers` |
| Messagerie | `/v1/messages` |
| Amis | `/v1/friends` |
| Administration | `/v1/admin` |
| Santé | `/health` |
| Documentation | `/v1/docs/` |

Swagger permet de consulter les schémas et les codes de réponse. Les routes protégées nécessitent un access token JWT dans l’en-tête `Authorization`.

## Base de données

Le modèle DBML se trouve dans `backend/database.dbml`. Les migrations couvrent notamment :

- utilisateurs, rôles, sessions et tentatives de connexion ;
- activités, catégories, établissements et géolocalisation ;
- créneaux, planning, réservations et avis ;
- amitiés, conversations, groupes et messages ;
- modération et journal d’audit.

Commandes :

```powershell
Set-Location backend
npm run migrate
npm run seed
```

En production, `npm start` applique les migrations compilées avant de démarrer l’API.

## Tests et qualité

### Backend

```powershell
Set-Location backend
npm ci
npx tsc --noEmit
npx jest --ci --coverage --coverageReporters=text-summary
npm run build
```

Résultat qualifié : **39 suites et 491 tests réussis**.

Couverture : **93,71 % statements, 84,01 % branches, 93,75 % functions et 94,97 % lines**.

### Client

```powershell
Set-Location myActivities
npm ci
npm run lint
npx tsc --noEmit
npx jest --ci --coverage
```

Résultat qualifié : **41 suites et 299 tests réussis**.

Couverture : **93,19 % statements, 83,78 % branches, 89,54 % functions et 94,48 % lines**. ESLint et TypeScript ne signalent aucune erreur ni aucun avertissement.

### Performance

Le test de fumée k6 réveille l’instance Render puis interroge dix fois le catalogue avec un seul utilisateur virtuel :

```powershell
npm run test:performance
```

Cette commande est exécutée depuis la racine du dépôt. Seuils du scénario :

- contrôles réussis à 100 % ;
- taux d’échec HTTP inférieur à 1 % ;
- percentile 95 inférieur à 500 ms.

Cette commande utilise l’image Docker officielle de k6 et cible l’API de démonstration.

## CI/CD

### Backend

Le workflow `.github/workflows/backend.yml` est déclenché pour les modifications du backend :

1. `npm ci` ;
2. contrôle TypeScript ;
3. tests Jest avec couverture ;
4. sur un push vers `main`, appel du Deploy Hook Render ;
5. construction de l’image de production ;
6. migrations, démarrage et health check.

Le hook Render est stocké dans le secret GitHub `RENDER_DEPLOY_HOOK_URL`.

### Mobile

Le workflow `.github/workflows/mobile.yml` exécute :

1. `npm ci` ;
2. ESLint ;
3. contrôle TypeScript ;
4. tests Jest avec couverture ;
5. soumission d’un build EAS Android `preview`.

Le secret GitHub `EXPO_TOKEN` authentifie EAS. La commande utilise `--no-wait` : le workflow valide l’acceptation de la demande, tandis que la compilation continue sur Expo. Un binaire doit encore être terminé, installé et recetté avant sa distribution.

Le job EAS est facultatif et non bloquant. En revanche, lint, TypeScript et les tests restent la porte de qualité obligatoire.

Le profil EAS `production` référence encore un domaine API non qualifié. Il ne doit pas être utilisé pour une publication tant que l’URL, le binaire et les parcours de recette ne sont pas validés.

## Sécurité et protection des données

- mots de passe hachés avec bcrypt ;
- access tokens courts et rotation des refresh tokens ;
- secrets distincts et injectés par l’environnement ;
- authentification et contrôle des rôles côté API ;
- validation Zod des entrées ;
- limitation globale et limitation renforcée de la connexion ;
- tentatives d’authentification persistées dans PostgreSQL ;
- échecs enregistrés seulement après comparaison négative du mot de passe ;
- JSON malformé transformé en réponse `400 INVALID_JSON` sans détail interne ;
- SIRET organisateur vérifié auprès de l’API publique Recherche d’entreprises avant attribution du rôle ;
- en-têtes Helmet et politique CORS explicite ;
- suppression de compte par anonymisation et révocation des sessions ;
- consentement demandé avant l’usage de la géolocalisation ;
- stockage des tokens mobiles avec `expo-secure-store` ;
- PostgreSQL et Valkey/Redis distants non exposés comme services publics applicatifs.

La géolocalisation sert au calcul de proximité et ne doit pas être historisée sans base légale et information de l’utilisateur.

## Accessibilité

Le projet applique notamment :

- contrastes renforcés ;
- composants et actions nommés pour les lecteurs d’écran ;
- prise en charge de TalkBack sur Android ;
- adaptation à l’agrandissement du texte ;
- navigation clavier et focus visible sur le web ;
- contrôle du back-office à 200 % de zoom ;
- absence de dépendance aux emojis système pour les icônes fonctionnelles.
- cibles tactiles principales d’au moins 44 × 44 ;
- messages de statut annoncés par les technologies d’assistance ;
- alternative textuelle à la carte et contrastes non textuels vérifiés automatiquement.

Le référentiel retenu pour l’évaluation est le RGAA 4.1.2 pour le web, complété par douze critères WCAG 2.2 A/AA applicables au mobile. Les douze contrôles du périmètre déclaré sont satisfaits ; cela ne constitue pas une déclaration de conformité RGAA globale. Une recette VoiceOver iOS complète reste à réaliser.

## Limites connues de `v0.9.1`

- pas de publication Google Play ni App Store ;
- résultat final d’un APK EAS installé non joint au dépôt public ;
- cible iOS non recettée ;
- back-office web non hébergé publiquement ;
- profil EAS `production` à finaliser ;
- notifications push non livrées ;
- sauvegarde et restauration Render à qualifier avant une exploitation publique ;
- modération préalable désactivée dans la configuration MVP.

Ces limites sont compatibles avec un prototype de version `0.x`, mais devront être levées avant une version `1.0.0`.

## Documentation de certification

Le dossier de certification contient notamment :

- protocoles d’intégration et de déploiement continus ;
- critères de qualité et de performance ;
- architecture et présentation du prototype ;
- tests unitaires ;
- sécurité et accessibilité ;
- historique des versions ;
- cahier de recettes et plan de correction des bogues ;
- manuels de déploiement, d’utilisation et de mise à jour.

Ces documents et leurs captures sont conservés dans `docs/bloc-c2/` dans l’espace de remise. Le dossier `docs/` est volontairement exclu du dépôt GitHub public afin de ne pas publier les pièces de certification et les captures de travail.

## Structure du dépôt

```text
.
├── .github/workflows/       # CI backend et mobile
├── backend/                 # API Express et TypeScript
│   ├── src/
│   │   ├── __tests__/       # Tests Jest et Supertest
│   │   ├── config/          # Variables d’environnement typées
│   │   ├── db/              # Migrations, seed et client PostgreSQL
│   │   ├── lib/             # Emails, géocodage, Redis et tokens
│   │   ├── middleware/      # Authentification, erreurs et limiteurs
│   │   ├── realtime/        # Socket.IO
│   │   ├── routes/          # Endpoints HTTP
│   │   ├── schemas/         # Validation Zod
│   │   └── services/        # Logique métier
│   ├── database.dbml        # Modèle de données
│   ├── Dockerfile           # Image dev et production
│   └── swagger.yaml         # Contrat OpenAPI
├── myActivities/            # Application Expo
│   ├── src/
│   │   ├── app/             # Écrans Expo Router
│   │   ├── components/      # Composants partagés
│   │   ├── context/         # Contextes React
│   │   ├── hooks/           # Hooks métier
│   │   └── lib/             # API, cartes, socket et stockage
│   ├── app.json             # Configuration Expo
│   └── eas.json             # Profils EAS
├── tests/performance/       # Scénario k6
├── docker-compose.yml       # API, PostgreSQL/PostGIS et Redis
├── render.yaml              # Blueprint Render
└── README.md
```

## Auteur

**Charles Deschamps** — [@CharlesDESC](https://github.com/CharlesDESC)

Projet réalisé dans le cadre du titre RNCP 39583 « Expert en Développement Logiciel ».
