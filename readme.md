
# Image-Watcher

Image Watcher est un service autonome conçu pour surveiller et gérer automatiquement les mises à jour des images Docker dans des déploiements Kubernetes (StatefulSet ou Deployment). Il permet de déclencher des mises à jour, de notifier des changements de version et de conserver un historique des images utilisées.

## 🚀 Installation rapide

### Via Docker

```bash
# Dernière version stable
docker pull ghcr.io/synseria/image-watcher:latest

# Version spécifique
docker pull ghcr.io/synseria/image-watcher:1.0.0

# Branche develop (développement)
docker pull ghcr.io/synseria/image-watcher:develop
```

### Via Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-watcher
  annotations:
    # Exemple d'annotation pour définir le mode et la stratégie
    image-watcher/mode: "NOTIFICATION"
    image-watcher/strategy: "MINOR"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: image-watcher
  template:
    metadata:
      labels:
        app: image-watcher
    spec:
      containers:
      - name: image-watcher
        image: ghcr.io/synseria/image-watcher:latest
        env:
        - name: LOG_LEVEL
          value: "INFO"
        # Ajoutez vos autres variables d'environnement ici
```

## Objectifs principaux

### Surveillance d’images

 - Vérifie régulièrement si de nouvelles versions des images utilisées dans les StatefulSets ou Deployments sont disponibles.

 - Supporte différents niveaux de stratégie de mise à jour : ALL, MAJOR, MINOR, PATCH.

### Mises à jour automatiques ou notifications

 - Peut appliquer automatiquement les mises à jour (AUTO_UPDATE) ou simplement notifier l’utilisateur (NOTIFICATION) via des API sécurisées.

### Historisation et traçabilité

 - Stocke les informations de mise à jour dans les annotations Kubernetes sur le metadata des StatefulSets/Deployments.

 - Permet de savoir exactement quelle version a été appliquée, quand, et quelle était la version précédente.

## Configuration

### Variables d'environnements

| Variable d'environnement | Valeur par défaut | Description |
|:-----------|:------------------:|:--------------|
| `NODE_ENV` | `production` | Définit le mode d’exécution de l’application (`development`, `production`, `test`). |
| `OPEN_AI_URL` | *(aucune)* | URL de l’API OpenAI (ou équivalent compatible, ex : `https://api.openai.com/v1`). |
| `OPEN_AI_KEY` | *(aucune)* | Clé API pour authentifier les requêtes OpenAI. |
| `OPEN_AI_MODEL` | *(aucune)* | Nom du modèle utilisé (ex : `gpt-4-turbo`, `gpt-4o-mini`, etc.). |
| `LOG_LEVEL` | `INFO` | Niveau de verbosité des logs (`ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`). |
| `IMAGE_WATCHER_MODE` | *(aucune)* | Mode de fonctionnement de l’image watcher. Ecrase les annotations : `AUTO_UPDATE`, `NOTIFICATION`, etc. |
| `IMAGE_WATCHER_STRATEGY` | *(aucune)* | Stratégie de suivi des images. Ecrase les annotations : `ALL`, `MAJOR`, `MINOR`, `PATCH`, etc. |
| `RUN_ON_BOOT` | `FALSE` | Si présent, exécute automatiquement la vérification au démarrage du service. `FALSE`, `TRUE` |
| `GITHUB_TOKEN` | *(aucune)* | Jeton d’accès GitHub pour authentifier les appels à l’API (évite les limites de rate limit). |

### Annotations Kubernetes

> ⚠️ **Important :** Ces annotations doivent être appliquées sur le **metadata.annotations** du **StatefulSet ou Deployment**, **et non directement sur les Pods**, afin que le watcher puisse les lire et les mettre à jour correctement.

| Annotation Kubernetes | Valeur par défaut | Description |
|:-----------------------:|:-----------------:|:-------------|
| `image-watcher/*` | **(aucune)**  | Une annotation de type `image-watcher/*` est utilisée pour configurer le comportement du watcher d’images. |
| `image-watcher/mode` | `"NOTIFICATION"`  | Mode de fonctionnement du watcher d’images (`AUTO_UPDATE`, `NOTIFICATION`, `DISABLED`). |
| `image-watcher/strategy` | `"ALL"` | Stratégie de suivi des images (`ALL`, `MAJOR`, `MINOR`, `PATCH`). |
| `image-watcher/release-url` | *Calculé* | URL du release ou tag associé à la mise à jour de l’image, ex : `https://api.github.com/repos/traefik/traefik/releases/tags/${tag}` |

> ⚠️ Les annotations suivantes sont **gérées automatiquement** par le watcher et **ne doivent pas être modifiées par l’utilisateur** :

| Annotation Kubernetes | Description |
|-----------------------|-------------|
| `image-watcher/last-updated` | Timestamp de la dernière mise à jour effectuée sur le déploiement ou StatefulSet. |
| `image-watcher/last-updated-version` | Version de l’image utilisée lors de la dernière mise à jour. |
| `image-watcher/last-notified`| Timestamp du dernier événement de notification envoyé par le watcher. |
| `image-watcher/last-notified-version` | Version de l’image pour laquelle une notification a été envoyée. |
| `image-watcher/previous-version` | Version précédente de l'image avant la mise à jour. |
| `image-watcher/current-version` | Version actuelle de l'image après la mise à jour. |
| `image-watcher/token-update`  | Token unique utilisé pour sécuriser le déclenchement d'une mise à jour manuelle via API. |

---

## 🛠️ Développement

### Prérequis

- Node.js 22+
- npm
- Docker (pour les builds locaux)

### Installation locale

```bash
# Cloner le repo
git clone https://github.com/Synseria/Image-Watcher.git
cd Image-Watcher

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer en mode développement
npm run dev
```

### Commandes disponibles

```bash
npm run dev          # Lancer en mode développement
npm run build        # Build TypeScript
npm test            # Lancer les tests
npm run test-int    # Lancer les tests d'intégration
npm run lint        # Vérifier le code
npm run format      # Formater le code
```

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
