# 🎓 Tutoriel : Premiers pas avec GitHub Actions

Ce tutoriel vous guide pas à pas pour mettre en place votre pipeline CI/CD.

---

## ✅ Prérequis

- Compte GitHub
- Git installé localement
- Docker installé (optionnel, pour tester localement)

---

## 📋 Étape 1 : Vérifier la configuration

### 1.1 Vérifier les fichiers créés

```bash
# Vérifier que les fichiers existent
ls -la .github/workflows/ci-cd.yaml
ls -la scripts/dev-helper.sh
```

### 1.2 Tester localement avant de push

```bash
# Utiliser le script d'aide
./scripts/dev-helper.sh

# Ou manuellement
npm run lint
npm test
npm run build
```

---

## 📋 Étape 2 : Premier push et test de la pipeline

### 2.1 Commit les changements

```bash
# Vérifier les changements
git status

# Ajouter les fichiers
git add .github/ scripts/ readme.md

# Commit
git commit -m "ci: ajout pipeline GitHub Actions avec Docker et releases"

# Push
git push origin synseria/docker
```

### 2.2 Vérifier l'exécution

1. Allez sur GitHub : https://github.com/Synseria/Image-Watcher
2. Cliquez sur l'onglet **"Actions"**
3. Vous devriez voir votre workflow en cours d'exécution
4. Cliquez dessus pour voir les détails

**Résultat attendu :**
- ✅ Job "Tests & Lint" : Doit passer
- ⏭️ Job "Build" : Sera skippé (pas sur master/dev)
- ⏭️ Job "Docker" : Sera skippé (pas sur master/dev)

---

## 📋 Étape 3 : Créer la branche dev

### 3.1 Créer et pusher dev

```bash
# Créer la branche dev depuis votre branche actuelle
git checkout -b dev

# Push
git push origin dev
```

### 3.2 Vérifier l'exécution

Retournez dans **Actions**, vous devriez mastertenant voir :
- ✅ Job "Tests & Lint"
- ✅ Job "Build TypeScript"
- ✅ Job "Docker Build & Push"

### 3.3 Vérifier l'image Docker créée

1. Allez sur : https://github.com/Synseria/Image-Watcher/pkgs/container/image-watcher
2. Vous devriez voir l'image avec le tag `dev`

**Si l'image est privée :**
```bash
# Se connecter à GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u Synseria --password-stdin

# Pull l'image
docker pull ghcr.io/synseria/image-watcher:dev
```

---

## 📋 Étape 4 : Créer la branche master

### 4.1 Créer master depuis dev

```bash
# Créer la branche master
git checkout -b master

# Push
git push origin master
```

### 4.2 Protéger la branche master

1. Allez dans **Settings** → **Branches**
2. Cliquez sur **"Add branch protection rule"**
3. Branch name pattern : `master`
4. Cochez :
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Sélectionnez : `test`, `docker`
5. Cliquez sur **"Create"**

mastertenant, impossible de push directement sur `master` ! Il faut passer par une PR.

---

## 📋 Étape 5 : Workflow complet - Feature → dev → master

### 5.1 Créer une nouvelle feature

```bash
# Retourner sur dev
git checkout dev
git pull

# Créer une branche feature
git checkout -b feature/test-pipeline

# Faire un petit changement (exemple)
echo "# Test pipeline" >> .github/TEST.md

# Commit et push
git add .
git commit -m "docs: test de la pipeline"
git push origin feature/test-pipeline
```

### 5.2 Créer une Pull Request vers dev

1. Sur GitHub, vous verrez un bouton **"Compare & pull request"**
2. Base : `dev` ← Compare : `feature/test-pipeline`
3. Créez la PR
4. Attendez que les checks passent (tests)
5. Mergez la PR

**Résultat :** L'image `ghcr.io/synseria/image-watcher:dev` est mise à jour

### 5.3 Merger dev vers master

1. Créez une nouvelle PR : `master` ← `dev`
2. Attendez les checks
3. Mergez

**Résultat :** L'image `ghcr.io/synseria/image-watcher:latest` est créée

---

## 📋 Étape 6 : Créer votre première release

### 6.1 Vérifier que vous êtes sur master

```bash
git checkout master
git pull
```

### 6.2 Créer un tag

**Option 1 : Via le script**
```bash
./scripts/dev-helper.sh
# Choisir l'option 6
```

**Option 2 : Manuellement**
```bash
# Créer le tag
git tag v1.0.0

# Push le tag
git push origin v1.0.0
```

### 6.3 Vérifier la release

1. **Actions** : Vérifiez que tous les jobs passent
2. **Packages** : Nouvelles images créées :
   - `ghcr.io/synseria/image-watcher:1.0.0`
   - `ghcr.io/synseria/image-watcher:1.0`
   - `ghcr.io/synseria/image-watcher:1`
3. **Releases** : Une release GitHub est créée automatiquement !
   - URL : https://github.com/Synseria/Image-Watcher/releases/tag/v1.0.0

---

## 📋 Étape 7 : Utiliser votre image

### 7.1 Localement avec Docker

```bash
# Pull
docker pull ghcr.io/synseria/image-watcher:1.0.0

# Run
docker run --rm -it ghcr.io/synseria/image-watcher:1.0.0
```

### 7.2 Dans Kubernetes

Créez un fichier `deployment.yaml` :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-watcher
  namespace: default
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
        image: ghcr.io/synseria/image-watcher:1.0.0
        imagePullPolicy: Always
        env:
        - name: LOG_LEVEL
          value: "INFO"
        - name: NODE_ENV
          value: "production"
      # Si l'image est privée, ajoutez :
      # imagePullSecrets:
      # - name: ghcr-secret
```

Appliquer :
```bash
kubectl apply -f deployment.yaml
```

---

## 🎉 Félicitations !

Vous avez mastertenant :
- ✅ Une pipeline CI/CD complète
- ✅ Des images Docker automatiquement construites
- ✅ Un système de releases automatisé
- ✅ Des tests qui tournent sur chaque PR

---

## 📊 Récapitulatif du workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow de développement                 │
└─────────────────────────────────────────────────────────────┘

1. Feature branch
   └─> feature/ma-feature
       ├─> git push
       └─> GitHub Actions: Tests ✅

2. Pull Request → dev
   └─> Merge
       ├─> GitHub Actions: Tests + Build + Docker ✅
       └─> Image: ghcr.io/.../image-watcher:dev

3. Pull Request → master
   └─> Merge
       ├─> GitHub Actions: Tests + Build + Docker ✅
       └─> Image: ghcr.io/.../image-watcher:latest

4. Tag release
   └─> git tag v1.0.0
       ├─> GitHub Actions: Tests + Docker + Release ✅
       ├─> Images: :1.0.0, :1.0, :1
       └─> GitHub Release créée automatiquement 🎁
```

---

## 🐛 Problèmes courants

### Erreur : Permission denied (GHCR)

**Solution :** Vérifiez que le workflow a la permission `packages: write`
```yaml
permissions:
  contents: read
  packages: write
```

### Erreur : Tests échouent

**Solution :** Testez localement d'abord
```bash
npm run lint
npm test
```

### Image Docker non trouvée

**Solution :** Vérifiez que l'image est publique ou que vous êtes authentifié
```bash
# Voir les packages
https://github.com/Synseria/Image-Watcher/pkgs/container/image-watcher

# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u Synseria --password-stdin
```

---

## 📚 Prochaines étapes

- [ ] Configurer les tests d'intégration
- [ ] Ajouter des environments (staging, production)
- [ ] Configurer les notifications (Slack, Discord)
- [ ] Ajouter du monitoring (Prometheus, Grafana)
- [ ] Mettre en place du canary deployment

---

**Besoin d'aide ?** Consultez :
- `.github/GITHUB_ACTIONS_GUIDE.md` - Guide complet
- `.github/QUICK_REFERENCE.md` - Aide-mémoire
- `./scripts/dev-helper.sh` - Script d'aide interactif
