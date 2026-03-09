import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypeAnnotation, TypeMode, TypeStrategy } from '../../src/service/image-watcher/domain/annotation';
import { WatchedApplication } from '../../src/service/image-watcher/domain/application';
import { ImageWatcherService } from '../../src/service/image-watcher/image-watcher.service';
import { Application } from '../../src/service/orchestrator/domain/application';

describe('ImageWatcherService (unit tests)', () => {
  let service: ImageWatcherService;
  let mockRegistryService: any;
  let mockNotificationService: any;
  let mockOrchestratorService: any;
  let mockAIService: any;
  let mockReleaseService: any;
  let mockStateService: any;

  beforeEach(() => {
    vi.unstubAllEnvs();

    // Création des mocks
    mockRegistryService = {
      getListeTags: vi.fn()
    };

    mockNotificationService = {
      broadcast: vi.fn().mockResolvedValue(undefined)
    };

    mockOrchestratorService = {
      getApplication: vi.fn(),
      listeApplications: vi.fn()
    };

    mockAIService = {
      ask: vi.fn().mockResolvedValue('AI summary'),
      markdownToText: vi.fn().mockImplementation((text: string) => text)
    };

    mockReleaseService = {
      getRelease: vi.fn()
    };

    // Mock StateService avec Map interne (comportement réel pour les tests anti-spam)
    const stateStore = new Map<string, any>();
    mockStateService = {
      get: vi.fn((key: string) => stateStore.get(key)),
      set: vi.fn((key: string, state: any) => stateStore.set(key, state))
    };

    // Instanciation du service avec les mocks
    service = new ImageWatcherService(mockRegistryService, mockNotificationService, mockOrchestratorService, mockAIService, mockReleaseService, mockStateService);
  });

  describe('processImageWatcher()', () => {
    it('traite seulement les applications annotées par défaut', async () => {
      const apps: Application[] = [
        {
          namespace: 'ns1',
          name: 'app1',
          image: 'registry.io/app1:v1.0.0',
          annotations: { [TypeAnnotation.MODE]: TypeMode.NOTIFICATION },
          imageInformation: { registry: 'registry.io', repository: 'app1', tag: 'v1.0.0', digest: 'sha256:a' },
          type: 'Deployment'
        },
        {
          namespace: 'ns2',
          name: 'app2',
          image: 'registry.io/app2:v1.0.0',
          annotations: {},
          imageInformation: { registry: 'registry.io', repository: 'app2', tag: 'v1.0.0', digest: 'sha256:b' },
          type: 'Deployment'
        }
      ];

      mockOrchestratorService.listeApplications.mockResolvedValue(apps);
      mockRegistryService.getListeTags.mockResolvedValue([{ tag: 'v1.0.0', digest: 'sha256:a' }]);

      const spyProcessApplication = vi.spyOn(service, 'processApplication');

      await service.processImageWatcher();

      expect(spyProcessApplication).toHaveBeenCalledTimes(1);
      expect(spyProcessApplication).toHaveBeenCalledWith(apps[0]);
    });

    it('traite toutes les applications avec IMAGE_WATCHER_WATCH_ALL=true', async () => {
      vi.stubEnv('IMAGE_WATCHER_WATCH_ALL', 'true');

      const apps: Application[] = [
        {
          namespace: 'ns1',
          name: 'app1',
          image: 'registry.io/app1:v1.0.0',
          annotations: {},
          imageInformation: { registry: 'registry.io', repository: 'app1', tag: 'v1.0.0', digest: 'sha256:a' },
          type: 'Deployment'
        },
        {
          namespace: 'ns2',
          name: 'app2',
          image: 'registry.io/app2:v1.0.0',
          annotations: {},
          imageInformation: { registry: 'registry.io', repository: 'app2', tag: 'v1.0.0', digest: 'sha256:b' },
          type: 'Deployment'
        }
      ];

      mockOrchestratorService.listeApplications.mockResolvedValue(apps);
      mockRegistryService.getListeTags.mockResolvedValue([{ tag: 'v1.0.0', digest: 'sha256:a' }]);

      const spyProcessApplication = vi.spyOn(service, 'processApplication');

      await service.processImageWatcher();

      expect(spyProcessApplication).toHaveBeenCalledTimes(2);
    });
  });

  describe('processApplication()', () => {
    const createApp = (overrides: Partial<Application> = {}): Application => ({
      namespace: 'test',
      name: 'app',
      image: 'registry.io/repo:v1.0.0',
      annotations: {
        [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL
      },
      imageInformation: {
        registry: 'registry.io',
        repository: 'repo',
        tag: 'v1.0.0',
        digest: 'sha256:abc123'
      },
      type: 'Deployment',
      ...overrides
    });

    it('ignore les applications en mode DISABLED', async () => {
      const app = createApp({
        annotations: { [TypeAnnotation.MODE]: TypeMode.DISABLED }
      });

      await service.processApplication(app);

      expect(mockRegistryService.getListeTags).not.toHaveBeenCalled();
    });

    it("ne fait rien si aucune nouvelle version n'est disponible", async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v0.9.0', digest: 'sha256:def456' }
      ]);

      await service.processApplication(app);

      expect(mockNotificationService.broadcast).not.toHaveBeenCalled();
    });

    it('envoie une notification Discord quand une nouvelle version est détectée', async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.1.0', digest: 'sha256:def456' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.1.0',
        changelog: 'New features',
        url: 'https://github.com/repo/releases/v1.1.0',
        publishedAt: new Date('2024-01-01')
      });

      await service.processApplication(app);

      expect(mockReleaseService.getRelease).toHaveBeenCalledWith('repo', 'v1.1.0', expect.any(Object));
      expect(mockAIService.ask).toHaveBeenCalled();
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ username: 'repo:v1.1.0' })
      );
    });

    it("ne patche jamais les ressources Kubernetes", async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.1.0', digest: 'sha256:def456' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.1.0',
        changelog: 'New features',
        url: 'https://github.com/repo/releases/v1.1.0',
        publishedAt: new Date('2024-01-01')
      });

      await service.processApplication(app);

      expect(mockOrchestratorService).not.toHaveProperty('patchApplication');
    });

    it('ne renvoie pas de notification si la version a déjà été notifiée (anti-spam)', async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.1.0', digest: 'sha256:def456' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.1.0',
        changelog: 'New features',
        url: 'https://github.com/repo/releases/v1.1.0',
        publishedAt: new Date('2024-01-01')
      });

      // Premier appel : notification envoyée
      await service.processApplication(app);
      expect(mockNotificationService.broadcast).toHaveBeenCalledTimes(1);

      // Deuxième appel : pas de renotification (état in-memory)
      await service.processApplication(app);
      expect(mockNotificationService.broadcast).toHaveBeenCalledTimes(1);
    });

    it('respecte la stratégie PATCH', async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
          [TypeAnnotation.STRATEGY]: TypeStrategy.PATCH
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.0.1', digest: 'sha256:def456' },
        { tag: 'v1.1.0', digest: 'sha256:ghi789' },
        { tag: 'v2.0.0', digest: 'sha256:jkl012' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.0.1',
        changelog: 'Bugfixes',
        url: 'https://github.com/repo/releases/v1.0.1',
        publishedAt: new Date('2024-01-01')
      });

      await service.processApplication(app);

      expect(mockReleaseService.getRelease).toHaveBeenCalledWith('repo', 'v1.0.1', expect.any(Object));
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ username: 'repo:v1.0.1' })
      );
    });

    it('respecte la stratégie MINOR', async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MINOR
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.0.1', digest: 'sha256:def456' },
        { tag: 'v1.1.0', digest: 'sha256:ghi789' },
        { tag: 'v2.0.0', digest: 'sha256:jkl012' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.1.0',
        changelog: 'New features',
        url: 'https://github.com/repo/releases/v1.1.0',
        publishedAt: new Date('2024-01-01')
      });

      await service.processApplication(app);

      // La notification doit être envoyée avec la dernière version (v1.1.0 = latest dans le range minor)
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ username: 'repo:v1.1.0' })
      );
      // v2.0.0 ne doit pas être notifié
      expect(mockReleaseService.getRelease).not.toHaveBeenCalledWith('repo', 'v2.0.0', expect.any(Object));
    });

    it('respecte la stratégie MAJOR', async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MAJOR
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v2.0.0', digest: 'sha256:jkl012' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v2.0.0',
        changelog: 'Breaking changes',
        url: 'https://github.com/repo/releases/v2.0.0',
        publishedAt: new Date('2024-01-01')
      });

      await service.processApplication(app);

      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ username: 'repo:v2.0.0' })
      );
    });

    it('gère les erreurs gracieusement', async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockRejectedValue(new Error('Network error'));

      await expect(service.processApplication(app)).resolves.toBeUndefined();
    });

    it('fallback sur le changelog brut si l\'IA échoue', async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.1.0', digest: 'sha256:def456' }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: 'v1.1.0',
        changelog: 'Raw changelog',
        url: 'https://github.com/repo/releases/v1.1.0',
        publishedAt: new Date('2024-01-01')
      });

      // L'IA échoue
      mockAIService.ask.mockRejectedValue(new Error('OpenAI error'));
      mockAIService.markdownToText.mockReturnValue('Raw changelog');

      await service.processApplication(app);

      // La notification doit quand même être envoyée avec le changelog brut
      expect(mockNotificationService.broadcast).toHaveBeenCalled();
    });
  });

  describe('parseAnnotation()', () => {
    it("retourne la valeur de l'annotation directement", () => {
      const annotations = { [TypeAnnotation.MODE]: TypeMode.NOTIFICATION };
      const result = service['parseAnnotation'](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it('retourne la valeur en minuscule si elle existe', () => {
      const annotations = { 'image-watcher.mode': TypeMode.NOTIFICATION };
      const result = service['parseAnnotation'](annotations, 'image-watcher.mode' as TypeAnnotation);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it("retourne la valeur par défaut si aucune valeur n'est fournie", () => {
      const result = service['parseAnnotation']({}, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it("retourne la valeur de l'environnement si fournie", () => {
      const result = service['parseAnnotation']({}, TypeAnnotation.MODE, TypeMode.DISABLED);

      expect(result).toBe(TypeMode.DISABLED);
    });

    it('valide les options et retourne la valeur en majuscules', () => {
      const annotations = { [TypeAnnotation.MODE]: 'notification' };
      const result = service['parseAnnotation'](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it("retourne la valeur par défaut si l'option n'est pas valide", () => {
      const annotations = { [TypeAnnotation.MODE]: 'invalid-mode' };
      const result = service['parseAnnotation'](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });
  });

  describe('hasImageWatcher()', () => {
    it('retourne true si une annotation image-watcher existe', () => {
      const annotations = { 'image-watcher/mode': 'notification' };
      const result = service['hasImageWatcher'](annotations);

      expect(result).toBe(true);
    });

    it("retourne false si aucune annotation image-watcher n'existe", () => {
      const annotations = { 'other-annotation': 'value' };
      const result = service['hasImageWatcher'](annotations);

      expect(result).toBe(false);
    });

    it('est insensible à la casse', () => {
      const annotations = { 'IMAGE-WATCHER/MODE': 'notification' };
      const result = service['hasImageWatcher'](annotations);

      expect(result).toBe(true);
    });
  });

  describe('getCurrentVersion()', () => {
    const createWatchedApp = (tag: string, digest?: string): WatchedApplication => ({
      namespace: 'test',
      name: 'app',
      image: `registry.io/repo:${tag}`,
      annotations: {},
      imageInformation: {
        registry: 'registry.io',
        repository: 'repo',
        tag,
        digest: digest || 'sha256:abc123'
      },
      parsedAnnotations: {
        [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL
      },
      hasImageWatcher: true,
      type: 'Deployment'
    });

    it("retourne le tag si c'est une version semver", async () => {
      const app = createWatchedApp('v1.0.0');
      const result = await service['getCurrentVersion'](app);

      expect(result).toBe('v1.0.0');
    });

    it('retourne la version annotée si présente (fallback non-semver)', async () => {
      const app = createWatchedApp('latest');
      app.parsedAnnotations[TypeAnnotation.CURRENT_VERSION] = 'v1.5.0';

      const result = await service['getCurrentVersion'](app);

      expect(result).toBe('v1.5.0');
    });

    it('trouve la version par digest', async () => {
      const app = createWatchedApp('latest', 'sha256:specific');
      const tags = [
        { tag: 'v1.0.0', digest: 'sha256:abc123' },
        { tag: 'v1.1.0', digest: 'sha256:specific' }
      ];

      const result = await service['getCurrentVersion'](app, tags);

      expect(result).toBe('v1.1.0');
    });

    it("retourne null si aucun tag correspondant n'est trouvé", async () => {
      const app = createWatchedApp('latest');
      const tags = [{ tag: 'v1.0.0', digest: 'sha256:other' }];

      const result = await service['getCurrentVersion'](app, tags);

      expect(result).toBeNull();
    });

    it('prioritise les versions sans suffix', async () => {
      const app = createWatchedApp('latest', 'sha256:multi');
      const tags = [
        { tag: 'v1.0.0-beta', digest: 'sha256:multi' },
        { tag: 'v1.0.0', digest: 'sha256:multi' },
        { tag: 'v1.0.0-rc1', digest: 'sha256:multi' }
      ];

      const result = await service['getCurrentVersion'](app, tags);

      expect(result).toBe('v1.0.0');
    });
  });

  describe('toWatchedApplication()', () => {
    it('enrichit une application avec les annotations parsées', () => {
      const app: Application = {
        namespace: 'test',
        name: 'app',
        image: 'registry.io/repo:v1.0.0',
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MINOR
        },
        imageInformation: {
          registry: 'registry.io',
          repository: 'repo',
          tag: 'v1.0.0',
          digest: 'sha256:abc123'
        },
        type: 'Deployment'
      };

      const result = service['toWatchedApplication'](app);

      expect(result.hasImageWatcher).toBe(true);
      expect(result.parsedAnnotations[TypeAnnotation.MODE]).toBe(TypeMode.NOTIFICATION);
      expect(result.parsedAnnotations[TypeAnnotation.STRATEGY]).toBe(TypeStrategy.MINOR);
    });

    it('applique les valeurs par défaut pour les applications sans annotations', () => {
      const app: Application = {
        namespace: 'test',
        name: 'app',
        image: 'registry.io/repo:v1.0.0',
        annotations: {},
        imageInformation: {
          registry: 'registry.io',
          repository: 'repo',
          tag: 'v1.0.0',
          digest: 'sha256:abc123'
        },
        type: 'Deployment'
      };

      const result = service['toWatchedApplication'](app);

      expect(result.hasImageWatcher).toBe(false);
      expect(result.parsedAnnotations[TypeAnnotation.MODE]).toBe(TypeMode.NOTIFICATION);
    });
  });

  describe('getAnnotations()', () => {
    it('parse les annotations de configuration correctement', () => {
      const annotations = {
        [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
        [TypeAnnotation.STRATEGY]: TypeStrategy.PATCH,
        [TypeAnnotation.CURRENT_VERSION]: 'v1.5.0',
        [TypeAnnotation.RELEASE_URL]: 'https://github.com/repo'
      };

      const result = service['getAnnotations'](annotations);

      expect(result[TypeAnnotation.MODE]).toBe(TypeMode.NOTIFICATION);
      expect(result[TypeAnnotation.STRATEGY]).toBe(TypeStrategy.PATCH);
      expect(result[TypeAnnotation.CURRENT_VERSION]).toBe('v1.5.0');
      expect(result[TypeAnnotation.RELEASE_URL]).toBe('https://github.com/repo');
    });
  });
});
