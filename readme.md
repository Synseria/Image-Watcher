# Image Watcher

Image Watcher est un opérateur Kubernetes qui surveille les images de conteneurs déployées (StatefulSet/Deployment), détecte automatiquement les nouvelles versions disponibles, récupère et synthétise les release notes via un LLM (OpenAI), puis notifie ou applique les mises à jour selon le mode choisi. Il permet ainsi de garder vos applications à jour, tout en informant les utilisateurs des changements apportés.

## Fonctionnalités principales

- **Surveillance automatique** des images de conteneurs sur vos clusters Kubernetes.
- **Détection des nouvelles versions** (stratégie configurable : MAJOR, MINOR, PATCH).
- **Récupération et synthèse IA** des release notes associées aux nouvelles versions (OpenAI).
- **Notification** des utilisateurs via webhook (Discord, etc.) avec un résumé des changements et un lien de mise à jour.
- **Mise à jour automatique** possible (mode AUTO_UPDATE) ou manuelle (mode NOTIFICATION).
- **Confirmation** du succès ou de l'échec du déploiement après mise à jour.
- **Configuration fine** via annotations Kubernetes ou variables d'environnement.

## Annotations à ajouter sur vos StatefulSet/Deployment

Ajoutez les annotations suivantes pour activer et configurer Image Watcher sur vos ressources :

```yaml
metadata:
	annotations:
		image-watcher/watch: "true"                # Active la surveillance (obligatoire)
		image-watcher/mode: "NOTIFICATION"         # Modes : AUTO_UPDATE, NOTIFICATION, DISABLED (optionnel)
		image-watcher/strategy: "MINOR"            # Stratégie : MAJOR, MINOR, PATCH (optionnel)
```

## Variables d'environnement (env)

| Variable                  | Par défaut                | Description |
|-------------------------- |--------------------------|-------------|
| `OPENAI_BASE_URL`         | https://api.openai.com/v1 | URL de l'API OpenAI |
| `OPENAI_MODEL`            | gpt-4o-mini               | Modèle OpenAI utilisé |
| `OPENAI_API_KEY`          | (optionnel)               | Clé API OpenAI (secret) |
| `GITHUB_TOKEN`            | (optionnel)               | Token GitHub pour récupérer les releases |
| `DISCORD_URL`             | (optionnel)               | Webhook Discord pour notifications |
| `IMAGE_WATCHER_MODE`      | NOTIFICATION              | Mode global : AUTO_UPDATE, NOTIFICATION, DISABLED |
| `IMAGE_WATCHER_STRATEGY`  | MINOR                     | Stratégie de mise à jour |
| `IMAGE_WATCHER_OVERRIDE`  | false                     | Forcer les valeurs d'env au lieu des annotations |
| `RUN_ON_BOOT`             | true                      | Démarrer le scan au boot |
| `PORT`                    | 3000                      | Port HTTP exposé |
| `BASE_URL`                | (auto)                    | URL de base pour les notifications |
| `TRUSTED_PROXY`           | 10.42.0.0/16              | Plage IP proxy de confiance |
| `TZ`                      | Europe/Paris              | Fuseau horaire |

## Déploiement via Helm (exemple)

Un chart Helm d'exemple est fourni dans le dossier `helm/`.

```sh
helm install image-watcher ./helm \
	--set openai.apiKey="<VOTRE_OPENAI_KEY>" \
	--set github.token="<VOTRE_GITHUB_TOKEN>" \
	--set discord.url="<VOTRE_DISCORD_WEBHOOK>"
```

## Modes de fonctionnement

- **AUTO_UPDATE** : Met à jour automatiquement l'image et notifie le résultat.
- **NOTIFICATION** : Notifie l'utilisateur d'une nouvelle version avec un lien pour déclencher la mise à jour.
- **DISABLED** : Désactive la surveillance pour la ressource.

## Exemple de notification (mode NOTIFICATION)

> Nouvelle version détectée : v1.2.3
>
> - Synthèse des release notes générée par IA
> - [Déployer la version v1.2.3](https://votre-url/api/upgrade/namespace/name?token=...&version=1.2.3)

---
