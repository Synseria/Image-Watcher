# 📘 Guide GitHub Actions - Image Watcher

Ce guide explique en détail comment fonctionne votre pipeline CI/CD.

---

## 🎯 Vue d'ensemble

Votre pipeline automatise 5 étapes principales :
1. **Tests** - Vérifie que le code fonctionne
2. **Build** - Compile le TypeScript
3. **Docker** - Crée et publie l'image Docker
4. **Release** - Crée des versions officielles
5. **Notification** - Résumé de l'exécution

---

## 🌳 Stratégie de branches

### **Branches principales**

```
master (production)
  ↑
dev (développement)
  ↑
feature/ma-fonctionnalité (développement de fonctionnalité)
```

### **Quand chaque job s'exécute ?**

| Branche / Action | Tests | Build TS | Docker | Release |
|------------------|-------|----------|--------|---------|
| `feature/*` (push) | ✅ | ❌ | ❌ | ❌ |
| `dev` (push) | ✅ | ✅ | ✅ | ❌ |
| `master` (push) | ✅ | ✅ | ✅ | ❌ |
| Tag `v*` (push) | ✅ | ❌ | ✅ | ✅ |
| Pull Request | ✅ | ❌ | ❌ | ❌ |

---

## 🐳 Tagging Docker (GHCR)

Vos images Docker sont automatiquement taguées selon le contexte :

### **Sur la branche `master` :**
```bash
ghcr.io/synseria/image-watcher:master
ghcr.io/synseria/image-watcher:latest
ghcr.io/synseria/image-watcher:master-sha-abc1234
```

### **Sur la branche `dev` :**
```bash
ghcr.io/synseria/image-watcher:dev
ghcr.io/synseria/image-watcher:dev-sha-def5678
```

### **Sur un tag `v1.2.3` :**
```bash
ghcr.io/synseria/image-watcher:1.2.3  # Version exacte
ghcr.io/synseria/image-watcher:1.2    # Version mineure
ghcr.io/synseria/image-watcher:1      # Version majeure
ghcr.io/synseria/image-watcher:latest # Dernière version
ghcr.io/synseria/image-watcher:v1.2.3-sha-ghi9012
```

---

## 🚀 Workflows typiques

### **1. Développer une nouvelle fonctionnalité**

```bash
# 1. Créer une branche de fonctionnalité
git checkout -b feature/mon-feature

# 2. Faire vos modifications
# ... codez ...

# 3. Commit et push
git add .
git commit -m "feat: ajoute nouvelle fonctionnalité"
git push origin feature/mon-feature

# ✅ GitHub Actions exécute : Tests uniquement
```

### **2. Merger vers dev**

```bash
# 1. Créer une Pull Request vers dev sur GitHub
# ✅ GitHub Actions exécute : Tests

# 2. Après merge
# ✅ GitHub Actions exécute : Tests → Build → Docker
# 🐳 Image disponible : ghcr.io/synseria/image-watcher:dev
```

### **3. Déployer en production**

```bash
# 1. Merger dev → master (via PR)
# ✅ GitHub Actions exécute : Tests → Build → Docker
# 🐳 Image disponible : ghcr.io/synseria/image-watcher:latest
```

### **4. Créer une release officielle**

```bash
# 1. Créer un tag de version
git checkout master
git pull
git tag v1.2.3
git push origin v1.2.3

# ✅ GitHub Actions exécute : Tests → Docker → Release
# 🐳 Images disponibles :
#    - ghcr.io/synseria/image-watcher:1.2.3
#    - ghcr.io/synseria/image-watcher:1.2
#    - ghcr.io/synseria/image-watcher:1
# 🎁 Release GitHub créée avec notes automatiques
```

---

## 📦 Utiliser vos images Docker

### **Depuis votre machine locale**

```bash
# 1. Se connecter à GHCR (une seule fois)
echo "VOTRE_GITHUB_TOKEN" | docker login ghcr.io -u VOTRE_USERNAME --password-stdin

# 2. Pull l'image
docker pull ghcr.io/synseria/image-watcher:latest

# 3. Run
docker run -d ghcr.io/synseria/image-watcher:latest
```

### **Dans Kubernetes**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-watcher
spec:
  template:
    spec:
      containers:
      - name: image-watcher
        image: ghcr.io/synseria/image-watcher:1.2.3
        # Ou :latest pour toujours la dernière version
```

---

## 🔐 Permissions et Secrets

### **Permissions automatiques**

GitHub Actions fournit automatiquement :
- `GITHUB_TOKEN` : Pour push sur GHCR et créer des releases
- Pas besoin de créer de secrets supplémentaires ! 🎉

### **Rendre vos images publiques (optionnel)**

Par défaut, vos images GHCR sont privées. Pour les rendre publiques :

1. Allez sur https://github.com/users/Synseria/packages
2. Cliquez sur votre package `image-watcher`
3. `Package settings` → `Change visibility` → `Public`

---

## 🐛 Debugging

### **Voir les logs des workflows**

1. Allez dans l'onglet **Actions** de votre repo
2. Cliquez sur un workflow
3. Cliquez sur un job pour voir les logs détaillés

### **Tester localement**

```bash
# Tester les commandes avant de push
npm run lint
npm test
npm run build

# Tester le Docker build
docker build -t test-image -f DockerFile .
docker run test-image
```

### **Jobs échoués ?**

Les causes communes :
- ❌ **Tests échouent** : Corrigez les tests localement d'abord
- ❌ **Lint échoue** : Lancez `npm run lint` localement
- ❌ **Build Docker échoue** : Testez `docker build` localement
- ❌ **Permission denied** : Vérifiez les permissions dans le workflow

---

## 🎓 Concepts avancés

### **Cache**

Le workflow utilise plusieurs caches pour accélérer l'exécution :
- **npm cache** : Réutilise les dépendances Node.js
- **Docker cache** : Réutilise les layers Docker (via `cache-from/to`)

### **Matrix builds** (pas encore implémenté)

Pour tester sur plusieurs versions de Node.js :

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### **Environments** (pas encore implémenté)

Pour différents environnements (staging, production) :

```yaml
jobs:
  deploy:
    environment: production
    # Peut nécessiter une approbation manuelle
```

---

## 📚 Ressources

- [Documentation GitHub Actions](https://docs.github.com/en/actions)
- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Metadata Action](https://github.com/docker/metadata-action)
- [Semantic Versioning](https://semver.org/)

---

## ✅ Checklist de déploiement

- [ ] Créer les branches `master` et `dev`
- [ ] Protéger la branche `master` (Settings → Branches → Branch protection rules)
- [ ] Tester la pipeline sur une feature branch
- [ ] Vérifier que l'image Docker est créée sur GHCR
- [ ] Créer un premier tag `v1.0.0` pour tester les releases
- [ ] Configurer les notifications (Discord/Telegram) si besoin

---

Bonne automatisation ! 🚀
