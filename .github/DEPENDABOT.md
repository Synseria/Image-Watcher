# 🤖 Guide Dependabot

## Qu'est-ce que Dependabot ?

Dependabot est un bot GitHub qui :
- 🔍 **Scanne** vos dépendances (npm, Docker, GitHub Actions)
- 🆕 **Détecte** les nouvelles versions
- 🔒 **Alerte** sur les failles de sécurité
- 📝 **Crée des PR** automatiquement
- ✅ **Tests** via GitHub Actions

---

## 📊 Types de mises à jour

### Semantic Versioning (vX.Y.Z)

| Type | Exemple | Description | Auto-merge ? |
|------|---------|-------------|--------------|
| **PATCH** | 1.0.0 → 1.0.1 | Bug fixes | ✅ Oui |
| **MINOR** | 1.0.0 → 1.1.0 | Nouvelles features (compatibles) | ✅ Oui |
| **MAJOR** | 1.0.0 → 2.0.0 | Breaking changes | ❌ Review manuelle |

---

## 🔄 Workflow Dependabot

```
Lundi 9h : Dependabot scanne
    ↓
Détecte : vitest 4.0.4 → 4.0.5 (PATCH)
    ↓
Crée une PR automatiquement
    ↓
GitHub Actions : Tests s'exécutent
    ↓
Tests ✅ → Auto-merge (si patch/minor)
Tests ❌ → PR reste ouverte pour review
```

---

## ⚙️ Configuration actuelle

### Fichier : `.github/dependabot.yml`

**Ce qui est surveillé :**
- 📦 **npm** (package.json)
- 🐳 **Docker** (DockerFile)
- ⚙️ **GitHub Actions** (.github/workflows/*.yaml)

**Fréquence :** Tous les lundis à 9h

**Limites :** Max 5 PR ouvertes simultanément

---

## 🎯 Auto-merge intelligent

### Fichier : `.github/workflows/dependabot-auto-merge.yaml`

**Règles :**
- ✅ **PATCH/MINOR** → Auto-merge après tests
- ❌ **MAJOR** → Review manuelle obligatoire

**Cible :** Branche `dev` uniquement (pas `master`)

---

## 📋 Exemples de PR Dependabot

### Exemple 1 : Mise à jour de sécurité 🔒
```
Bump express from 5.0.0 to 5.0.1

⚠️ Security alert: CVE-2024-XXXXX
Severity: High

This update includes a security fix.
Auto-merge: ✅ (after tests pass)
```

### Exemple 2 : Mise à jour mineure
```
Bump vitest from 4.0.4 to 4.1.0

Release notes:
- New feature: parallel test execution
- Bug fixes

Auto-merge: ✅ (after tests pass)
```

### Exemple 3 : Mise à jour majeure ⚠️
```
Bump typescript from 5.9.3 to 6.0.0

⚠️ BREAKING CHANGES
- Removed deprecated features
- New syntax requirements

Auto-merge: ❌ (manual review required)
```

---

## 🛠️ Gestion des PR Dependabot

### PR avec auto-merge activé

```bash
# Rien à faire ! 
# Si les tests passent → merge automatique
# Si les tests échouent → la PR reste ouverte
```

### PR nécessitant une review (major)

1. **Vérifier les changements**
   - Lire les release notes
   - Vérifier les breaking changes

2. **Tester localement (optionnel)**
   ```bash
   gh pr checkout <PR_NUMBER>
   npm install
   npm test
   ```

3. **Merger ou fermer**
   - Si OK → Merger
   - Si problème → Fermer avec commentaire

---

## 🔒 Sécurité

### Alertes de sécurité

Dependabot crée des PR **immédiates** pour les failles critiques :

```
🚨 Security Alert
Severity: Critical
Package: express@5.0.0
Vulnerability: CVE-2024-12345
Fix available: 5.0.1
```

**Action :** Mergez rapidement après vérification des tests !

---

## 📈 Statistiques Dependabot

Vous pouvez voir :
- **Insights** → **Dependency graph** → **Dependabot**
- Nombre de PR créées
- Temps moyen de merge
- Alertes de sécurité résolues

---

## 🎛️ Personnalisation avancée

### Ignorer certaines dépendances

Dans `.github/dependabot.yml` :

```yaml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    
    # Ignorer certains packages
    ignore:
      - dependency-name: "typescript"
        versions: ["6.x"]  # Ignorer la v6
      - dependency-name: "eslint"
        update-types: ["version-update:semver-major"]  # Pas de major
```

### Regrouper les mises à jour

```yaml
groups:
  dev-dependencies:
    patterns:
      - "@types/*"
      - "eslint*"
      - "prettier"
    update-types:
      - "minor"
      - "patch"
```

**Résultat :** Une seule PR pour toutes les dépendances de dev

---

## 🔄 Commandes utiles

### Voir les PR Dependabot ouvertes
```bash
gh pr list --author app/dependabot
```

### Forcer une vérification Dependabot
```bash
# Via l'interface GitHub
Settings → Code security → Dependabot → Check for updates
```

### Merger manuellement une PR Dependabot
```bash
gh pr merge <PR_NUMBER> --squash
```

### Fermer une PR Dependabot
```bash
gh pr close <PR_NUMBER> --comment "Not needed"
```

---

## ⚠️ Problèmes courants

### PR Dependabot bloquée

**Cause :** Tests qui échouent

**Solution :**
1. Voir les logs des tests
2. Corriger le code localement
3. Push sur la branche Dependabot :
   ```bash
   gh pr checkout <PR_NUMBER>
   # ... corrections ...
   git push
   ```

### Trop de PR ouvertes

**Solution :** Ajuster `open-pull-requests-limit` dans `dependabot.yml`

```yaml
open-pull-requests-limit: 3  # Max 3 PR
```

### PR non auto-mergées

**Cause :** Protection de branche trop stricte

**Solution :** Vérifier que dev permet l'auto-merge :
- Settings → Branches → dev
- ✅ Allow auto-merge

---

## ✅ Checklist Dependabot

- [ ] Dependabot activé sur GitHub
- [ ] Fichier `.github/dependabot.yml` créé
- [ ] Workflow auto-merge configuré
- [ ] Première PR Dependabot reçue
- [ ] Auto-merge testé sur une PR patch/minor
- [ ] Review manuelle testée sur une PR major
- [ ] Alertes de sécurité configurées

---

## 📚 Ressources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Auto-merge Guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

**Dependabot maintient votre projet à jour automatiquement ! 🤖✨**
