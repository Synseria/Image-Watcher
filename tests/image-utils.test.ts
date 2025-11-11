import { describe, expect, it } from 'vitest';
import { parseImageName } from '../src/utils/image-utils';

describe('parseImageName()', () => {
  describe('Images simples (Docker Hub)', () => {
    it('parse une image sans tag (implicit latest)', () => {
      const result = parseImageName('nginx');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: 'latest',
        digest: undefined
      });
    });

    it('parse une image avec tag', () => {
      const result = parseImageName('nginx:1.25');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: '1.25',
        digest: undefined
      });
    });

    it('parse une image avec namespace', () => {
      const result = parseImageName('library/nginx');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'library/nginx',
        tag: 'latest',
        digest: undefined
      });
    });

    it('parse une image avec namespace et tag', () => {
      const result = parseImageName('library/nginx:alpine');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'library/nginx',
        tag: 'alpine',
        digest: undefined
      });
    });
  });

  describe('Images avec registry', () => {
    it('parse une image ghcr.io', () => {
      const result = parseImageName('ghcr.io/owner/repo:v1.0.0');
      expect(result).toEqual({
        registry: 'ghcr.io',
        repository: 'owner/repo',
        tag: 'v1.0.0',
        digest: undefined
      });
    });

    it('parse une image gcr.io', () => {
      const result = parseImageName('gcr.io/project-id/image:latest');
      expect(result).toEqual({
        registry: 'gcr.io',
        repository: 'project-id/image',
        tag: 'latest',
        digest: undefined
      });
    });

    it('parse une image avec registry et port', () => {
      const result = parseImageName('registry.example.com:5000/myapp:v2');
      expect(result).toEqual({
        registry: 'registry.example.com:5000',
        repository: 'myapp',
        tag: 'v2',
        digest: undefined
      });
    });

    it('parse une image avec registry, port et namespace', () => {
      const result = parseImageName('registry.example.com:5000/team/myapp:v2');
      expect(result).toEqual({
        registry: 'registry.example.com:5000',
        repository: 'team/myapp',
        tag: 'v2',
        digest: undefined
      });
    });

    it('parse une image avec plusieurs niveaux de namespace', () => {
      const result = parseImageName('ghcr.io/org/team/project:latest');
      expect(result).toEqual({
        registry: 'ghcr.io',
        repository: 'org/team/project',
        tag: 'latest',
        digest: undefined
      });
    });
  });

  describe('Images avec digest', () => {
    it('parse une image avec digest uniquement', () => {
      const result = parseImageName('nginx@sha256:abc123def456');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: 'latest',
        digest: 'sha256:abc123def456'
      });
    });

    it('parse une image avec tag et digest', () => {
      const result = parseImageName('nginx:1.25@sha256:abc123def456');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: '1.25',
        digest: 'sha256:abc123def456'
      });
    });

    it('parse une image avec registry, tag et digest', () => {
      const result = parseImageName('ghcr.io/owner/repo:v1.0.0@sha256:abc123');
      expect(result).toEqual({
        registry: 'ghcr.io',
        repository: 'owner/repo',
        tag: 'v1.0.0',
        digest: 'sha256:abc123'
      });
    });

    it('parse une image avec registry, port, tag et digest', () => {
      const result = parseImageName('registry.example.com:5000/myapp:v2@sha256:xyz789');
      expect(result).toEqual({
        registry: 'registry.example.com:5000',
        repository: 'myapp',
        tag: 'v2',
        digest: 'sha256:xyz789'
      });
    });
  });

  describe('Cas particuliers', () => {
    it('gère un tag vide (devient latest)', () => {
      const result = parseImageName('nginx:');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: 'latest',
        digest: undefined
      });
    });

    it('gère localhost comme registry', () => {
      const result = parseImageName('localhost:5000/myapp:dev');
      expect(result).toEqual({
        registry: 'localhost:5000',
        repository: 'myapp',
        tag: 'dev',
        digest: undefined
      });
    });

    it('gère une IP comme registry', () => {
      const result = parseImageName('192.168.1.100:5000/myapp:v1');
      expect(result).toEqual({
        registry: '192.168.1.100:5000',
        repository: 'myapp',
        tag: 'v1',
        digest: undefined
      });
    });

    it('ne confond pas un namespace avec un registry', () => {
      const result = parseImageName('owner/repo:tag');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'owner/repo',
        tag: 'tag',
        digest: undefined
      });
    });

    it('gère les registres avec sous-domaines', () => {
      const result = parseImageName('my.private.registry.com/team/app:v1.0.0');
      expect(result).toEqual({
        registry: 'my.private.registry.com',
        repository: 'team/app',
        tag: 'v1.0.0',
        digest: undefined
      });
    });
  });

  describe('Images réelles courantes', () => {
    it('parse nginx officiel', () => {
      const result = parseImageName('nginx:1.25.3-alpine');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'nginx',
        tag: '1.25.3-alpine',
        digest: undefined
      });
    });

    it('parse postgres officiel', () => {
      const result = parseImageName('postgres:15-alpine');
      expect(result).toEqual({
        registry: 'docker.io',
        repository: 'postgres',
        tag: '15-alpine',
        digest: undefined
      });
    });

    it('parse une image GitHub Actions', () => {
      const result = parseImageName('ghcr.io/actions/runner:latest');
      expect(result).toEqual({
        registry: 'ghcr.io',
        repository: 'actions/runner',
        tag: 'latest',
        digest: undefined
      });
    });

    it('parse une image Google Cloud', () => {
      const result = parseImageName('gcr.io/google-containers/pause:3.9');
      expect(result).toEqual({
        registry: 'gcr.io',
        repository: 'google-containers/pause',
        tag: '3.9',
        digest: undefined
      });
    });

    it('parse une image Kubernetes', () => {
      const result = parseImageName('registry.k8s.io/kube-apiserver:v1.28.0');
      expect(result).toEqual({
        registry: 'registry.k8s.io',
        repository: 'kube-apiserver',
        tag: 'v1.28.0',
        digest: undefined
      });
    });
  });
});
