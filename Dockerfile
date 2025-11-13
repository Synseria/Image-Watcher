# Étape 1 : builder (installation des dépendances + build)
FROM node:lts-alpine AS builder

WORKDIR /app

# Copier package.json + package-lock.json pour profiter du cache Docker
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le code source et les configs de build
COPY tsconfig.json ./
COPY src ./src

# Builder le projet TypeScript
RUN npm run build

# Étape 2 : image finale légère
FROM node:lts-alpine

WORKDIR /app

# Copier uniquement package.json pour réinstaller les prod dependencies
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev && npm cache clean --force

# Copier le code compilé depuis le builder
COPY --from=builder /app/dist ./dist

# Variables d'environnement par défaut
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

# Commande par défaut
CMD ["node", "dist/index.js"]
