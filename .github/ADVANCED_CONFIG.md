# 🔧 Configurations avancées GitHub Actions

Ce document contient des exemples de configurations avancées pour améliorer votre pipeline.

---

## 🎯 1. Tests sur plusieurs versions de Node.js

Modifiez le job `test` dans `.github/workflows/ci-cd.yaml` :

```yaml
test:
  name: 🧪 Tests & Lint
  runs-on: ubuntu-latest
  
  strategy:
    matrix:
      node-version: [18, 20, 22]  # Teste sur plusieurs versions
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🟢 Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: 📦 Install dependencies
      run: npm ci

    - name: 🔍 Run Linter
      run: npm run lint

    - name: ✅ Run Tests
      run: npm test
```

---

## 🐳 2. Build multi-architecture Docker

Pour supporter ARM64 (Apple Silicon, Raspberry Pi, etc.) :

```yaml
docker:
  name: 🐳 Docker Build & Push
  runs-on: ubuntu-latest
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🔧 Set up QEMU
      uses: docker/setup-qemu-action@v3

    - name: 🔧 Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: 🔐 Log in to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: 🚀 Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./DockerFile
        platforms: linux/amd64,linux/arm64  # Multi-arch !
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
```

---

## 📊 3. Code Coverage avec Codecov

Ajoutez après les tests :

```yaml
- name: ✅ Run Tests with Coverage
  run: npm run test -- --coverage

- name: 📊 Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

Dans `package.json`, ajoutez :
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 🔒 4. Scan de sécurité Docker avec Trivy

Ajoutez après le build Docker :

```yaml
- name: 🔒 Run Trivy security scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: 📋 Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  if: always()
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## 🌍 5. Déploiement avec Environments

Créez des environments (staging, production) pour les déploiements :

```yaml
deploy-staging:
  name: 🚀 Deploy to Staging
  runs-on: ubuntu-latest
  needs: [test, docker]
  if: github.ref == 'refs/heads/dev'
  
  environment:
    name: staging
    url: https://staging.example.com
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🚀 Deploy to Kubernetes
      run: |
        kubectl config use-context staging
        kubectl set image deployment/image-watcher \
          image-watcher=ghcr.io/${{ github.repository }}:dev

deploy-production:
  name: 🚀 Deploy to Production
  runs-on: ubuntu-latest
  needs: [test, docker]
  if: github.ref == 'refs/heads/master'
  
  environment:
    name: production
    url: https://example.com
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🚀 Deploy to Kubernetes
      run: |
        kubectl config use-context production
        kubectl set image deployment/image-watcher \
          image-watcher=ghcr.io/${{ github.repository }}:latest
```

Sur GitHub : **Settings → Environments** pour configurer les approbations.

---

## 📢 6. Notifications Discord/Slack

### Discord

```yaml
notify-discord:
  name: 📢 Notify Discord
  runs-on: ubuntu-latest
  needs: [test, docker]
  if: always()
  
  steps:
    - name: 📢 Send Discord notification
      uses: sarisia/actions-status-discord@v1
      with:
        webhook: ${{ secrets.DISCORD_WEBHOOK }}
        title: "Image Watcher CI/CD"
        description: |
          **Branch:** ${{ github.ref_name }}
          **Commit:** ${{ github.sha }}
          **Author:** ${{ github.actor }}
        status: ${{ job.status }}
```

### Slack

```yaml
notify-slack:
  name: 📢 Notify Slack
  runs-on: ubuntu-latest
  needs: [test, docker]
  if: always()
  
  steps:
    - name: 📢 Send Slack notification
      uses: slackapi/slack-github-action@v1
      with:
        webhook: ${{ secrets.SLACK_WEBHOOK }}
        payload: |
          {
            "text": "CI/CD Pipeline: ${{ job.status }}",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Image Watcher* - ${{ github.ref_name }}\nStatus: ${{ job.status }}"
                }
              }
            ]
          }
```

**Configuration :**
1. Créez un webhook Discord/Slack
2. Ajoutez le secret dans **Settings → Secrets → Actions**

---

## 📦 7. Cache NPM optimisé

```yaml
- name: 📦 Cache node_modules
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

---

## 🔄 8. Auto-merge Dependabot

Créez `.github/workflows/dependabot-auto-merge.yaml` :

```yaml
name: Dependabot Auto-merge

on:
  pull_request:
    branches: [dev]

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    
    steps:
      - name: 🤖 Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v1

      - name: ✅ Enable auto-merge for Dependabot PRs
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 🧪 9. Tests d'intégration séparés

```yaml
integration-tests:
  name: 🧪 Integration Tests
  runs-on: ubuntu-latest
  needs: test
  
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🟢 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: 📦 Install dependencies
      run: npm ci

    - name: 🧪 Run integration tests
      run: npm run test-int
      env:
        DATABASE_URL: postgres://postgres:postgres@postgres:5432/testdb
```

---

## 📈 10. Métriques de performance

```yaml
performance:
  name: 📈 Performance Metrics
  runs-on: ubuntu-latest
  needs: build
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 📈 Analyze bundle size
      run: |
        npm run build
        npx bundlesize
      continue-on-error: true

    - name: 💾 Upload size report
      uses: actions/upload-artifact@v4
      with:
        name: size-report
        path: dist/
```

---

## 🔐 11. Signature des images Docker avec Cosign

```yaml
- name: 🔐 Install Cosign
  uses: sigstore/cosign-installer@v3

- name: 🔑 Sign Docker image
  run: |
    cosign sign --yes \
      ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
  env:
    COSIGN_EXPERIMENTAL: 1
```

---

## 🎭 12. Preview deployments (pour les PRs)

```yaml
preview:
  name: 🎭 Deploy Preview
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🚀 Deploy to preview
      run: |
        # Créer un namespace temporaire pour la PR
        PR_NUMBER=${{ github.event.pull_request.number }}
        kubectl create namespace preview-pr-$PR_NUMBER --dry-run=client -o yaml | kubectl apply -f -
        
        # Déployer dans ce namespace
        kubectl config set-context --current --namespace=preview-pr-$PR_NUMBER
        kubectl apply -f k8s/

    - name: 💬 Comment PR with preview URL
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '🎭 Preview deployed at: https://preview-pr-${{ github.event.pull_request.number }}.example.com'
          })
```

---

## 🎯 13. Conditional jobs basés sur les fichiers modifiés

```yaml
changes:
  name: 🔍 Detect changes
  runs-on: ubuntu-latest
  outputs:
    backend: ${{ steps.filter.outputs.backend }}
    docker: ${{ steps.filter.outputs.docker }}
  
  steps:
    - uses: actions/checkout@v4
    
    - uses: dorny/paths-filter@v2
      id: filter
      with:
        filters: |
          backend:
            - 'src/**'
            - 'package.json'
          docker:
            - 'DockerFile'
            - 'docker-compose.yml'

test:
  needs: changes
  if: needs.changes.outputs.backend == 'true'
  # ... reste du job

docker:
  needs: changes
  if: needs.changes.outputs.docker == 'true'
  # ... reste du job
```

---

## 💡 Tips généraux

### Accélérer les workflows

1. **Parallélisez** : Exécutez les jobs indépendants en parallèle
2. **Cache** : Utilisez le cache pour npm, Docker layers, etc.
3. **Conditionnels** : Ne lancez que les jobs nécessaires

### Sécurité

1. **Minimisez les permissions** : `permissions: read-all` par défaut
2. **Scannez les dépendances** : Dependabot, Snyk
3. **Signez les images** : Cosign, Notary

### Debugging

```yaml
- name: 🐛 Debug
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    echo "Actor: ${{ github.actor }}"
```

---

Bonne automatisation ! 🚀
