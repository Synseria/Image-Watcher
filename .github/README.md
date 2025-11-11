# 📚 Documentation GitHub Actions - Index

Bienvenue dans la documentation complète de la pipeline CI/CD d'Image Watcher !

---

## 🎯 Par où commencer ?

### 🆕 Débutant complet en GitHub Actions ?

Commencez par cette série :

1. 📘 **[Guide complet](GITHUB_ACTIONS_GUIDE.md)** - Introduction détaillée aux concepts
2. 🎓 **[Tutoriel pas à pas](TUTORIAL.md)** - Configuration étape par étape
3. ✅ **[Checklist](CHECKLIST.md)** - Vérifiez que tout fonctionne

### 🚀 Vous connaissez déjà les bases ?

Allez directement à :

- 📋 **[Aide-mémoire](QUICK_REFERENCE.md)** - Commandes rapides
- 🎨 **[Diagrammes](DIAGRAMS.md)** - Visualisations du workflow
- 🔧 **[Configurations avancées](ADVANCED_CONFIG.md)** - Exemples pour aller plus loin

---

## 📁 Structure de la documentation

### 📘 [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md)

**Contenu :** Guide complet pour débutants

**Pour qui :** Débutants, première configuration

**Sujets couverts :**
- Vue d'ensemble de GitHub Actions
- Stratégie de branches (master, dev, feature)
- Tagging Docker sur GHCR
- Workflows typiques de développement
- Utilisation des images Docker
- Permissions et sécurité
- Debugging

---

### 🎓 [TUTORIAL.md](TUTORIAL.md)

**Contenu :** Tutoriel pratique étape par étape

**Pour qui :** Tous niveaux, première mise en place

**Étapes :**
1. Vérification de la configuration
2. Premier push et test
3. Création des branches dev et master
4. Workflow complet feature → dev → master
5. Création de votre première release
6. Utilisation des images Docker
7. Troubleshooting

---

### 📋 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**Contenu :** Aide-mémoire rapide

**Pour qui :** Développeurs au quotidien

**Contient :**
- Commandes Git essentielles
- Scripts npm disponibles
- Commandes Docker
- Tableau de déclenchement des jobs
- Tags Docker automatiques
- Liens utiles

---

### ✅ [CHECKLIST.md](CHECKLIST.md)

**Contenu :** Checklist de déploiement complète

**Pour qui :** Validation de la configuration

**Phases couvertes :**
1. Configuration initiale
2. Configuration GitHub
3. Premier test (feature branch)
4. Test sur dev
5. Test sur master
6. Test de release
7. Configuration avancée
8. Documentation
9. Production

---

### 🎨 [DIAGRAMS.md](DIAGRAMS.md)

**Contenu :** Visualisations et diagrammes

**Pour qui :** Apprentissage visuel

**Diagrammes disponibles :**
- Architecture de la pipeline
- Stratégie de branches
- Tagging Docker automatique
- Workflow de développement complet
- Flowchart de décision des jobs
- États des images Docker
- Permissions et accès
- Timeline d'exécution

---

### 🔧 [ADVANCED_CONFIG.md](ADVANCED_CONFIG.md)

**Contenu :** Configurations avancées et exemples

**Pour qui :** Utilisateurs avancés, optimisation

**Sujets couverts :**
- Tests multi-versions Node.js
- Build Docker multi-architecture
- Code coverage avec Codecov
- Scan de sécurité avec Trivy
- Déploiement avec Environments
- Notifications Discord/Slack
- Cache NPM optimisé
- Auto-merge Dependabot
- Tests d'intégration séparés
- Métriques de performance
- Signature d'images avec Cosign
- Preview deployments pour PRs
- Jobs conditionnels par fichiers modifiés

---

## 🛠️ Outils et scripts

### 📜 `../scripts/dev-helper.sh`

**Description :** Script interactif pour faciliter le développement

**Fonctionnalités :**
- Tester localement (lint + tests)
- Build TypeScript
- Build Docker image
- Test Docker image
- Voir le statut Git
- Créer une release (tag)
- Voir les images Docker GHCR
- Aide contextuelle

**Utilisation :**
```bash
./scripts/dev-helper.sh
```

---

### 📄 `.env.example`

**Description :** Template de configuration

**Contient :**
- Variables Node.js (NODE_ENV, LOG_LEVEL)
- Configuration OpenAI (API, clés, modèles)
- Configuration Image Watcher (mode, stratégie)
- Configuration GitHub (tokens)
- Configuration Kubernetes

**Utilisation :**
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## 🔗 Fichiers de configuration

### `.github/workflows/ci-cd.yaml`

**Description :** Définition de la pipeline CI/CD

**Jobs configurés :**
1. **test** - Tests et linting
2. **build** - Build TypeScript
3. **docker** - Build et push des images Docker
4. **release** - Création de releases GitHub
5. **notify** - Notifications de statut

**Déclencheurs :**
- Push sur toutes les branches
- Pull requests vers master/dev
- Tags v*

---

### `DockerFile`

**Description :** Configuration Docker multi-stage

**Étapes :**
1. Builder : Installation des dépendances
2. Production : Image finale légère

**Base :** `node:lts-alpine`

---

## 📊 Résumé des workflows

### Cas d'usage courant

| Situation | Documentation recommandée |
|-----------|---------------------------|
| 🆕 Première fois | [TUTORIAL.md](TUTORIAL.md) |
| 📚 Comprendre les concepts | [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md) |
| 🚀 Utiliser au quotidien | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| ✅ Vérifier la config | [CHECKLIST.md](CHECKLIST.md) |
| 🎨 Voir le flow visuel | [DIAGRAMS.md](DIAGRAMS.md) |
| 🔧 Optimiser/Améliorer | [ADVANCED_CONFIG.md](ADVANCED_CONFIG.md) |
| 🐛 Problème technique | [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md#-debugging) |
| 🏷️ Créer une release | [TUTORIAL.md](TUTORIAL.md#-étape-6--créer-votre-première-release) |
| 🐳 Utiliser les images | [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md#-utiliser-vos-images-docker) |

---

## 🎓 Parcours d'apprentissage recommandé

### Niveau 1 : Débutant (1-2h)

1. Lire la vue d'ensemble dans [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md)
2. Regarder les diagrammes dans [DIAGRAMS.md](DIAGRAMS.md)
3. Suivre le [TUTORIAL.md](TUTORIAL.md) étape par étape
4. Vérifier avec la [CHECKLIST.md](CHECKLIST.md) (phases 1-6)

**Objectif :** Comprendre le flow, créer sa première release

---

### Niveau 2 : Intermédiaire (1h)

1. Maîtriser le [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. Utiliser le script `dev-helper.sh`
3. Comprendre tous les jobs de `.github/workflows/ci-cd.yaml`
4. Tester les workflows sur dev et master

**Objectif :** Utiliser la pipeline au quotidien

---

### Niveau 3 : Avancé (2-3h)

1. Explorer [ADVANCED_CONFIG.md](ADVANCED_CONFIG.md)
2. Implémenter 2-3 configurations avancées
3. Optimiser les temps d'exécution
4. Configurer les notifications
5. Ajouter des environments (staging, production)

**Objectif :** Pipeline production-ready optimisée

---

## 📞 Support et ressources

### Documentation officielle

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Metadata Action](https://github.com/docker/metadata-action)

### Dans ce projet

- 📂 Documentation complète : `.github/*.md`
- 🔧 Script d'aide : `scripts/dev-helper.sh`
- ⚙️ Configuration : `.github/workflows/ci-cd.yaml`
- 📝 Exemple d'env : `.env.example`

### URLs importantes

- **Repository** : https://github.com/Synseria/Image-Watcher
- **Actions** : https://github.com/Synseria/Image-Watcher/actions
- **Packages** : https://github.com/Synseria/Image-Watcher/pkgs/container/image-watcher
- **Releases** : https://github.com/Synseria/Image-Watcher/releases

---

## 🗺️ Navigation rapide

```
📚 Documentation Index (vous êtes ici)
│
├─ 📘 Pour comprendre
│  ├─ GITHUB_ACTIONS_GUIDE.md  → Concepts détaillés
│  ├─ DIAGRAMS.md              → Visualisations
│  └─ ADVANCED_CONFIG.md       → Exemples avancés
│
├─ 🚀 Pour agir
│  ├─ TUTORIAL.md              → Pas à pas
│  ├─ QUICK_REFERENCE.md       → Commandes rapides
│  └─ CHECKLIST.md             → Validation
│
└─ 🛠️ Outils
   ├─ scripts/dev-helper.sh    → Script interactif
   ├─ .env.example             → Configuration
   └─ .github/workflows/       → Pipeline CI/CD
```

---

## 📋 Tableau récapitulatif

| Document | Pages | Temps lecture | Niveau | Objectif |
|----------|-------|---------------|--------|----------|
| **GITHUB_ACTIONS_GUIDE.md** | ~10 | 30 min | 🟢 Débutant | Comprendre |
| **TUTORIAL.md** | ~8 | 45 min | 🟢 Débutant | Pratiquer |
| **QUICK_REFERENCE.md** | ~2 | 5 min | 🟡 Intermédiaire | Référence |
| **CHECKLIST.md** | ~7 | 20 min | 🟡 Intermédiaire | Valider |
| **DIAGRAMS.md** | ~5 | 15 min | 🟢 Débutant | Visualiser |
| **ADVANCED_CONFIG.md** | ~12 | 60 min | 🔴 Avancé | Optimiser |

---

## 🎯 Prochaines étapes

Après avoir lu cette documentation :

1. [ ] Lire le guide approprié selon votre niveau
2. [ ] Configurer votre première pipeline
3. [ ] Tester le workflow complet
4. [ ] Créer votre première release
5. [ ] Explorer les configurations avancées

---

**Bonne lecture et bonne automatisation ! 🚀**

*Dernière mise à jour : Novembre 2025*
