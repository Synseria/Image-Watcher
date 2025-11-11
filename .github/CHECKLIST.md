# ✅ Checklist de déploiement GitHub Actions

Utilisez cette checklist pour vous assurer que tout est correctement configuré.

---

## 📋 Phase 1 : Configuration initiale

### Fichiers du projet

- [ ] `.github/workflows/ci-cd.yaml` existe et est valide
- [ ] `DockerFile` existe et fonctionne
- [ ] `package.json` contient les scripts nécessaires :
  - [ ] `npm run lint`
  - [ ] `npm test`
  - [ ] `npm run build`
- [ ] `.env.example` existe pour documenter les variables
- [ ] `readme.md` est à jour avec les badges

### Tests locaux

- [ ] `npm run lint` passe sans erreur
- [ ] `npm test` passe sans erreur
- [ ] `npm run build` génère les fichiers dans `dist/`
- [ ] `docker build -f DockerFile .` fonctionne
- [ ] L'image Docker démarre correctement

### Script d'aide

- [ ] `scripts/dev-helper.sh` existe
- [ ] Le script est exécutable (`chmod +x`)
- [ ] Toutes les options du menu fonctionnent

---

## 📋 Phase 2 : Configuration GitHub

### Repository Settings

- [ ] Repository est public ou privé selon vos besoins
- [ ] Actions sont activées (Settings → Actions → General)
- [ ] Workflow permissions configurées :
  - [ ] Settings → Actions → General → Workflow permissions
  - [ ] Cocher "Read and write permissions"
  - [ ] Cocher "Allow GitHub Actions to create and approve pull requests"

### Branches

- [ ] Branche `master` existe
- [ ] Branche `dev` existe
- [ ] Branche par défaut configurée (Settings → Branches)

### Branch Protection (optionnel mais recommandé)

#### Protection de `master`

- [ ] Aller dans Settings → Branches → Add rule
- [ ] Branch name pattern : `master`
- [ ] Cocher les options :
  - [ ] Require a pull request before merging
  - [ ] Require approvals (au moins 1)
  - [ ] Require status checks to pass before merging
    - [ ] Ajouter : `test`
    - [ ] Ajouter : `docker` (si applicable)
  - [ ] Require branches to be up to date before merging
  - [ ] Do not allow bypassing the above settings

#### Protection de `dev` (optionnel)

- [ ] Branch name pattern : `dev`
- [ ] Require status checks to pass before merging
  - [ ] Ajouter : `test`

---

## 📋 Phase 3 : Premier test

### Test sur feature branch

- [ ] Créer une branche : `git checkout -b feature/test-ci`
- [ ] Faire un changement mineur
- [ ] Commit et push : `git push origin feature/test-ci`
- [ ] Aller dans Actions et vérifier :
  - [ ] Workflow "CI/CD Pipeline" apparaît
  - [ ] Job "Tests & Lint" démarre
  - [ ] Job "Tests & Lint" passe ✅
  - [ ] Jobs "Build" et "Docker" sont skippés (normal)

### Test sur dev

- [ ] Merger la feature vers dev (via PR ou direct push)
- [ ] Aller dans Actions et vérifier :
  - [ ] Job "Tests & Lint" passe ✅
  - [ ] Job "Build TypeScript" passe ✅
  - [ ] Job "Docker Build & Push" passe ✅
  - [ ] Durée totale < 10 minutes

### Vérifier l'image Docker

- [ ] Aller dans Packages (icône en haut à droite du repo)
- [ ] Package "image-watcher" existe
- [ ] Tag `dev` est présent
- [ ] Tag a été créé récemment (timestamp correct)
- [ ] Image contient les bonnes métadonnées

---

## 📋 Phase 4 : Test sur master

### Merger vers master

- [ ] Créer une PR : `dev` → `master`
- [ ] Les checks passent
- [ ] Merger la PR
- [ ] Vérifier dans Actions :
  - [ ] Tous les jobs passent ✅
  - [ ] Durée similaire à dev

### Vérifier les images

- [ ] Tag `master` créé
- [ ] Tag `latest` créé ou mis à jour
- [ ] Tag avec le SHA du commit créé

### Test de l'image

- [ ] Pull l'image : `docker pull ghcr.io/OWNER/image-watcher:latest`
- [ ] Run l'image : `docker run --rm -it ghcr.io/OWNER/image-watcher:latest`
- [ ] L'application démarre correctement

---

## 📋 Phase 5 : Test de release

### Créer un tag

- [ ] Se positionner sur master : `git checkout master && git pull`
- [ ] Créer un tag : `git tag v1.0.0` ou utiliser `./scripts/dev-helper.sh`
- [ ] Push le tag : `git push origin v1.0.0`

### Vérifier le workflow

- [ ] Aller dans Actions
- [ ] Workflow "CI/CD Pipeline" avec le tag v1.0.0
- [ ] Job "Tests & Lint" passe ✅
- [ ] Job "Docker Build & Push" passe ✅
- [ ] Job "GitHub Release" passe ✅
- [ ] Tous les jobs complétés

### Vérifier la release

- [ ] Aller dans Releases (onglet principal du repo)
- [ ] Release "v1.0.0" est créée
- [ ] Release contient :
  - [ ] Titre : "Release v1.0.0"
  - [ ] Description avec les changements
  - [ ] Instructions pour pull l'image Docker
  - [ ] Tag v1.0.0

### Vérifier les images Docker

- [ ] Tag `1.0.0` existe
- [ ] Tag `1.0` existe
- [ ] Tag `1` existe
- [ ] Tag `latest` mis à jour
- [ ] Tous les tags pointent vers la même image (même SHA)

### Tester l'image de release

- [ ] Pull avec version exacte : `docker pull ghcr.io/OWNER/image-watcher:1.0.0`
- [ ] Pull avec version mineure : `docker pull ghcr.io/OWNER/image-watcher:1.0`
- [ ] Pull avec version majeure : `docker pull ghcr.io/OWNER/image-watcher:1`
- [ ] Toutes les commandes fonctionnent

---

## 📋 Phase 6 : Configuration avancée (optionnel)

### Rendre l'image publique

- [ ] Aller sur https://github.com/users/OWNER/packages/container/image-watcher
- [ ] Cliquer sur "Package settings"
- [ ] Section "Danger Zone" → "Change visibility"
- [ ] Sélectionner "Public"
- [ ] Confirmer
- [ ] Tester : `docker pull ghcr.io/OWNER/image-watcher:latest` (sans auth)

### Ajouter des secrets (si nécessaire)

Pour les notifications, tokens externes, etc. :

- [ ] Aller dans Settings → Secrets and variables → Actions
- [ ] Cliquer sur "New repository secret"
- [ ] Ajouter vos secrets :
  - [ ] `DISCORD_WEBHOOK` (si notifications Discord)
  - [ ] `SLACK_WEBHOOK` (si notifications Slack)
  - [ ] Autres secrets nécessaires

### Configurer Dependabot

- [ ] Aller dans Settings → Code security and analysis
- [ ] Activer "Dependabot alerts"
- [ ] Activer "Dependabot security updates"
- [ ] Créer `.github/dependabot.yml` (voir ADVANCED_CONFIG.md)

### Badge dans le README

- [ ] Badge CI/CD est visible
- [ ] Badge Release est visible
- [ ] Badge Docker est visible
- [ ] Tous les badges cliquables et fonctionnels

---

## 📋 Phase 7 : Documentation

### Fichiers de documentation

- [ ] `.github/GITHUB_ACTIONS_GUIDE.md` est complet
- [ ] `.github/QUICK_REFERENCE.md` est à jour
- [ ] `.github/TUTORIAL.md` est clair
- [ ] `.github/ADVANCED_CONFIG.md` contient des exemples
- [ ] `.github/DIAGRAMS.md` est compréhensible
- [ ] `readme.md` contient :
  - [ ] Badges
  - [ ] Section Installation
  - [ ] Section Développement
  - [ ] Liens vers la documentation

### README mis à jour

- [ ] Instructions d'installation claires
- [ ] Exemples d'utilisation
- [ ] Lien vers les releases
- [ ] Lien vers les packages
- [ ] Section développement

---

## 📋 Phase 8 : Tests complets

### Workflow complet

- [ ] Feature → dev → master → release fonctionne de bout en bout
- [ ] Chaque étape déclenche les bons jobs
- [ ] Les images sont créées avec les bons tags
- [ ] Les releases sont générées automatiquement

### Performance

- [ ] Pipeline < 10 minutes (avec cache)
- [ ] Cache npm fonctionne (vérifier les logs)
- [ ] Cache Docker fonctionne (vérifier les logs)
- [ ] Pas de warnings critiques dans les logs

### Notifications (si configurées)

- [ ] Discord reçoit les notifications
- [ ] Slack reçoit les notifications
- [ ] Contenu des notifications correct

---

## 📋 Phase 9 : Production

### Déploiement Kubernetes (si applicable)

- [ ] Deployment.yaml utilise la bonne image
- [ ] ImagePullSecrets configurés (si image privée)
- [ ] Variables d'environnement correctes
- [ ] L'application démarre dans le cluster
- [ ] Les logs sont corrects
- [ ] L'application fonctionne comme attendu

### Monitoring (si configuré)

- [ ] Logs accessibles
- [ ] Métriques collectées
- [ ] Alertes configurées

---

## 🎉 Validation finale

### Checklist globale

- [ ] ✅ Tous les jobs de la pipeline passent
- [ ] ✅ Images Docker créées et accessibles
- [ ] ✅ Releases GitHub générées automatiquement
- [ ] ✅ Documentation complète et à jour
- [ ] ✅ Script d'aide fonctionnel
- [ ] ✅ Tests locaux passent
- [ ] ✅ Workflow de développement clair
- [ ] ✅ Branch protection active
- [ ] ✅ Badges visibles dans le README

### Test de smoke

Effectuez un cycle complet :

1. [ ] Créer une feature branch
2. [ ] Faire un changement
3. [ ] Push et vérifier que les tests passent
4. [ ] Créer une PR vers dev
5. [ ] Merger et vérifier l'image :dev
6. [ ] Créer une PR vers master
7. [ ] Merger et vérifier l'image :latest
8. [ ] Créer un tag vX.Y.Z
9. [ ] Vérifier la release et les images
10. [ ] Pull et tester l'image finale

---

## 📝 Notes

### Problèmes rencontrés

```
Date : _____________
Problème : _________________________________________
Solution : _________________________________________
```

### Temps d'exécution

- Pipeline sur feature : _______ minutes
- Pipeline sur dev : _______ minutes
- Pipeline sur master : _______ minutes
- Pipeline avec release : _______ minutes

### URLs importantes

- Repository : https://github.com/_______________
- Actions : https://github.com/_______________/actions
- Packages : https://github.com/_______________/pkgs/container/image-watcher
- Releases : https://github.com/_______________/releases

---

## ✅ Signature

**Configuration validée par :** _______________

**Date :** _______________

**Version :** v1.0.0

---

Félicitations ! Votre pipeline CI/CD est mastertenant opérationnelle ! 🚀
