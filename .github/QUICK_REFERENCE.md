# 🚀 Aide-mémoire GitHub Actions

## Commandes rapides

### 🎯 Script d'aide interactif
```bash
./scripts/dev-helper.sh
```

### 🧪 Tests et validation locale
```bash
npm run lint           # Vérifier le code
npm test              # Lancer les tests
npm run build         # Build TypeScript
```

### 🐳 Docker local
```bash
# Build l'image
docker build -t image-watcher:test -f DockerFile .

# Lancer le conteneur
docker run --rm -it image-watcher:test

# Pull depuis GHCR
docker pull ghcr.io/synseria/image-watcher:latest
```

### 🌳 Workflow Git

#### Nouvelle fonctionnalité
```bash
git checkout -b feature/nom-feature
# ... faire vos modifications ...
git add .
git commit -m "feat: description"
git push origin feature/nom-feature
# → Créer PR vers dev
```

#### Release
```bash
git checkout master
git pull
git tag v1.2.3
git push origin v1.2.3
# → GitHub Actions crée la release automatiquement
```

## 📊 Quand les jobs s'exécutent

| Action | Tests | Build | Docker | Release |
|--------|-------|-------|--------|---------|
| Push sur feature/* | ✅ | ❌ | ❌ | ❌ |
| Push sur dev | ✅ | ✅ | ✅ | ❌ |
| Push sur master | ✅ | ✅ | ✅ | ❌ |
| Push tag v* | ✅ | ❌ | ✅ | ✅ |
| Pull Request | ✅ | ❌ | ❌ | ❌ |

## 🏷️ Tags Docker automatiques

### Branch dev
```
ghcr.io/synseria/image-watcher:dev
ghcr.io/synseria/image-watcher:dev-sha-abc123
```

### Branch master
```
ghcr.io/synseria/image-watcher:master
ghcr.io/synseria/image-watcher:latest
ghcr.io/synseria/image-watcher:master-sha-def456
```

### Tag v1.2.3
```
ghcr.io/synseria/image-watcher:1.2.3
ghcr.io/synseria/image-watcher:1.2
ghcr.io/synseria/image-watcher:1
ghcr.io/synseria/image-watcher:latest
```

## 🔗 Liens utiles

- **Actions** : https://github.com/Synseria/Image-Watcher/actions
- **Packages** : https://github.com/Synseria/Image-Watcher/pkgs/container/image-watcher
- **Releases** : https://github.com/Synseria/Image-Watcher/releases

## 🐛 Debugging

### Voir les logs
1. Aller dans l'onglet "Actions" du repo
2. Cliquer sur le workflow
3. Cliquer sur le job pour voir les logs

### Tests échouent ?
```bash
npm run lint          # Vérifier les erreurs de linting
npm test             # Voir les tests qui échouent
npm run test-int     # Tests d'intégration
```

### Docker échoue ?
```bash
docker build -f DockerFile .  # Tester le build local
docker logs <container-id>    # Voir les logs
```

## 📚 Documentation complète

Voir `.github/GITHUB_ACTIONS_GUIDE.md` pour le guide complet.
