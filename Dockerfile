## =============================================================================
## Dockerfile multi-étages pour Image-Watcher
## =============================================================================
## Objectifs :
##  - Construire le code TypeScript en JavaScript (dist/) dans un environnement isolé
##  - Produire une image finale minimale (only prod deps + artefacts build)
##  - Réduire la surface d'attaque et le temps de démarrage
##  - Optimiser le cache pour accélérer les builds CI/CD
##
## Étapes :
##  1. builder : installation complète (dev + prod) puis compilation
##  2. runtime : copie des artefacts compilés + installation des seules dépendances prod
##
## Bonnes pratiques utilisées :
##  - npm ci : installation déterministe selon package-lock.json
##  - --omit=dev : exclusion des devDependencies pour une image plus légère
##  - cache npm nettoyé pour réduire la taille finale
##  - Variables d'environnement déclarées explicitement (documentation intégrée)
## =============================================================================

# Étape 1 : builder (installation des dépendances + compilation TypeScript)
FROM node:lts-alpine AS builder

WORKDIR /app

# Copie du manifest + lockfile pour tirer parti du cache des couches
COPY package*.json ./

# Installation complète (inclut devDependencies nécessaires à la compilation)
RUN npm ci

# Copie du code source et des fichiers de configuration TypeScript
COPY tsconfig.json ./
COPY src ./src

# Compilation du projet (génère dist/)
RUN npm run build

# Étape 2 : image finale épurée (runtime uniquement)
FROM node:lts-alpine

WORKDIR /app

# Copie du manifest pour réinstaller uniquement les dépendances de production
COPY package*.json ./

# Installation des dépendances nécessaires à l'exécution (sans dev)
# Nettoyage du cache npm pour réduire la taille finale
RUN npm ci --omit=dev && npm cache clean --force

# Copie des artefacts compilés depuis l'étage builder
COPY --from=builder /app/dist ./dist

# -----------------------------------------------------------------------------
# Variables d'environnement (valeurs par défaut)
# -----------------------------------------------------------------------------
# PORT                : Port HTTP d'exposition du serveur
# READINESS_STRICT    : Si true, readiness probe exige toutes les conditions OK
# NODE_ENV            : Environnement Node (production pour optimisations)
# IMAGE_WATCHER_SCHEDULE : Cron d'exécution du watcher (ici toutes les 3h)
# IMAGE_WATCHER_STRATEGY : Stratégie de version ciblée (MAJOR/MINOR/PATCH)
# TZ                  : Fuseau horaire utilisé pour logs / scheduling
# LOG_FORMAT          : Format de sortie du logger (pretty/json)
# LOG_LEVEL           : Niveau de verbosité (info/debug/warn/error)
# BASE_URL            : URL de base exposée (utile pour génération de liens)
# RUN_ON_BOOT         : Si true, exécute une itération à l'initialisation
# IMAGE_WATCHER_MODE  : Mode opérationnel (NOTIFICATION / AUTORELEASE ...)
# OTEL_ENABLED        : Active instrumentation OpenTelemetry si true
# OTEL_SERVICE_NAME   : Nom logique du service pour traçage distribué
# -----------------------------------------------------------------------------
ENV PORT="3000"
ENV READINESS_STRICT="true"
ENV NODE_ENV="production"
ENV IMAGE_WATCHER_SCHEDULE="0 */3 * * *"
ENV IMAGE_WATCHER_STRATEGY="MAJOR"
ENV TZ="Europe/Paris"
ENV LOG_FORMAT="pretty"
ENV LOG_LEVEL="info"
ENV BASE_URL="http://localhost:3000"
ENV RUN_ON_BOOT="false"
ENV IMAGE_WATCHER_MODE="NOTIFICATION"
ENV OTEL_ENABLED="false"
ENV OTEL_SERVICE_NAME="image-watcher"

# Commande de démarrage par défaut (peut être surchargée avec ENTRYPOINT/CMD)
CMD ["node", "dist/index.js"]
