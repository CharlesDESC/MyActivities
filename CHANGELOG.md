# Journal des versions

Les changements significatifs de MyActivities sont consignés dans ce fichier.
Le format suit les principes de Keep a Changelog et le projet utilise une
numérotation sémantique tant que cela reste compatible avec son statut de
prototype `0.x`.

## [Unreleased]

### Ajouté

- Veille hebdomadaire des dépendances npm du backend et du mobile, ainsi que
  des GitHub Actions, avec Dependabot (`f687c48`).
- Sonde externe GitHub Actions planifiée toutes les quinze minutes sur
  `/health`, avec nouvelles tentatives, journalisation du temps de réponse et
  création d'un ticket sans doublon en cas d'échec persistant (`f687c48`).
- Dossier de maintenance et d'exploitation du BLOC 4 pour la remise de
  certification.

### Modifié

- Documentation de la version remise `v0.9.1`, de son périmètre et de ses
  limites connues dans le README (`aa408e9`).
- Politique Dependabot du mobile : les montées mineures et majeures de React
  Native sont désormais traitées avec une montée contrôlée du SDK Expo, tandis
  que les correctifs compatibles `0.86.x` restent automatisés (`5e7a5d4`).

### Corrigé

- Rejet de la mise à jour incompatible React Native `0.87.0` proposée par
  Dependabot dans la PR
  [#12](https://github.com/CharlesDESC/MyActivities/pull/12) : Expo SDK 57
  conserve React Native `0.86.x`.
- Alignement de l'environnement mobile après le crash natif Hermes constaté
  sur un téléphone Android physique : Expo `57.0.15`, React Native `0.86.2`,
  Reanimated `4.5.1`, Worklets `0.10.1` et Screens `4.26.2`
  ([issue #16](https://github.com/CharlesDESC/MyActivities/issues/16),
  [PR #17](https://github.com/CharlesDESC/MyActivities/pull/17), `91a06b2`).

## [0.9.1] - 2026-07-24

### Ajouté

- Vérification du SIRET lors de l'inscription d'un organisateur (`caa1b7f`).
- Contrôles d'accessibilité supplémentaires sur les principaux parcours
  (`65c56e8`).

### Modifié

- Renforcement et nettoyage du suivi des tentatives d'authentification
  (`fe22a9e`).
- Mise à niveau de dépendances backend et mobile (`65c56e8`).

### Corrigé

- `BUG-001` : une requête contenant un JSON malformé retourne désormais
  `400 INVALID_JSON` sans détail interne (`6fd8d58`).
- Enregistrement des échecs de connexion pour les pseudos inconnus et les mots
  de passe erronés (`fe22a9e`).
- Plusieurs lacunes d'accessibilité visuelle, sémantique et tactile
  (`65c56e8`).

### Sécurité

- Amélioration de la protection contre les tentatives de connexion répétées.
- Fermeture de risques liés au traitement du JSON et aux versions de
  dépendances.

## [0.9.0] - 2026-07-24

### Ajouté

- Prototype fonctionnel de l'API Express/TypeScript et de l'application
  Expo/React Native.
- Authentification, catalogue d'activités, planning, avis, édition et
  suppression d'activités.
- Réservations et consultation des participants pour les organisateurs
  (`0f8beba`).
- Messagerie temps réel, relations entre utilisateurs et gestion des
  établissements.
- Documentation Swagger et migrations PostgreSQL/PostGIS.
- Pipelines CI backend et mobile et déploiement du backend sur Render.
- Tests unitaires, d'intégration et scénario de performance k6.

### Modifié

- Remplacement du géocodage Mapbox par l'API publique IGN (`09dc450`).
- Build EAS rendu facultatif et non bloquant, tandis que les contrôles de
  qualité restent obligatoires (`22e2bc3`).
- Harmonisation du thème, des icônes et des composants accessibles
  (`aa0b609`).

### Corrigé

- Chargement des statistiques organisateur, auparavant incompatible avec le
  format de réponse réel de l'API (`ca88046`).
- URL de production du contrat Swagger et configuration de l'application
  mobile (`1e45de2`, `78ef441`).
- Permissions Android nécessaires au fonctionnement de l'application
  (`4d2854e`).

### Sécurité

- Validation des entrées avec Zod, mots de passe hachés et contrôle des rôles.
- Limitation des requêtes, rotation des refresh tokens, Helmet et CORS.
- Configuration explicite du proxy de confiance et mise à jour de dépendances
  présentant un risque (`1788c31`).

[Unreleased]: https://github.com/CharlesDESC/MyActivities/compare/v0.9.1...HEAD
[0.9.1]: https://github.com/CharlesDESC/MyActivities/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/CharlesDESC/MyActivities/releases/tag/v0.9.0
