import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TypeAnnotation, TypeMode, TypeStrategy } from "../../src/service/image-watcher/domain/annotation";
import { WatchedApplication } from "../../src/service/image-watcher/domain/application";
import { ImageWatcherService } from "../../src/service/image-watcher/image-watcher.service";
import { Application } from "../../src/service/orchestrator/domain/application";

describe("ImageWatcherService (unit tests)", () => {
  let service: ImageWatcherService;
  let mockRegistryService: any;
  let mockNotificationService: any;
  let mockOrchestratorService: any;
  let mockAIService: any;
  let mockReleaseService: any;

  beforeEach(() => {
    // Création des mocks
    mockRegistryService = {
      getListeTags: vi.fn()
    };

    mockNotificationService = {
      broadcast: vi.fn().mockResolvedValue(undefined)
    };

    mockOrchestratorService = {
      getApplication: vi.fn(),
      patchApplication: vi.fn(),
      listeApplications: vi.fn()
    };

    mockAIService = {
      ask: vi.fn().mockResolvedValue("AI summary")
    };

    mockReleaseService = {
      getRelease: vi.fn()
    };

    // Instanciation du service avec les mocks
    service = new ImageWatcherService(
      mockRegistryService,
      mockNotificationService,
      mockOrchestratorService,
      mockAIService,
      mockReleaseService
    );
  });

  describe("findApplication()", () => {
    it("retourne null si l'application n'existe pas", async () => {
      mockOrchestratorService.getApplication.mockResolvedValue(null);

      const result = await service.findApplication("test-ns", "test-app");

      expect(result).toBeNull();
      expect(mockOrchestratorService.getApplication).toHaveBeenCalledWith("test-ns", "test-app");
    });

    it("enrichit et retourne l'application si elle existe", async () => {
      const app: Application = {
        namespace: "test-ns",
        name: "test-app",
        image: "registry.io/repo:v1.0.0",
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE
        },
        type: "Deployment",
        imageInformation: {
          registry: "registry.io",
          repository: "repo",
          tag: "v1.0.0",
          digest: "sha256:abc123"
        }
      };

      mockOrchestratorService.getApplication.mockResolvedValue(app);

      const result = await service.findApplication("test-ns", "test-app");

      expect(result).toBeDefined();
      expect(result?.namespace).toBe("test-ns");
      expect(result?.name).toBe("test-app");
      expect(result?.hasImageWatcher).toBe(true);
      expect(result?.parsedAnnotations).toBeDefined();
    });
  });

  describe("upgradeApplication()", () => {
    const createTestApplication = (): WatchedApplication => ({
      namespace: "test-ns",
      name: "test-app",
      image: "registry.io/repo:v1.0.0",
      annotations: {},
      imageInformation: {
        registry: "registry.io",
        repository: "repo",
        tag: "v1.0.0",
        digest: "sha256:abc123"
      },
      parsedAnnotations: {
        [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL
      },
      hasImageWatcher: true,
      type: "Deployment"
    });

    it("met à jour l'application avec succès", async () => {
      const app = createTestApplication();
      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      const result = await service.upgradeApplication(app, "v1.1.0");

      expect(result).toBe(true);
      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        app,
        expect.objectContaining({
          [TypeAnnotation.CURRENT_VERSION]: "v1.1.0",
          [TypeAnnotation.PREVIOUS_VERSION]: "v1.0.0",
          [TypeAnnotation.LAST_UPDATED]: expect.any(Date),
          [TypeAnnotation.TOKEN_UPDATE]: null
        }),
        "registry.io/repo:v1.1.0"
      );
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.stringContaining("Mise à jour terminée"),
        expect.objectContaining({
          username: "repo:v1.1.0"
        })
      );
    });

    it("gère l'échec de mise à jour", async () => {
      const app = createTestApplication();
      mockOrchestratorService.patchApplication.mockResolvedValue(false);

      const result = await service.upgradeApplication(app, "v1.1.0");

      expect(result).toBe(false);
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.stringContaining("Échec de la mise à jour"),
        expect.any(Object)
      );
    });
  });

  describe("processImageWatcher()", () => {
    it("traite toutes les applications avec image-watcher", async () => {
      const apps: Application[] = [
        {
          namespace: "ns1",
          name: "app1",
          image: "registry.io/app1:v1.0.0",
          annotations: { [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE },
          imageInformation: { registry: "registry.io", repository: "app1", tag: "v1.0.0", digest: "sha256:a" },
          type: "Deployment"
        },
        {
          namespace: "ns2",
          name: "app2",
          image: "registry.io/app2:v1.0.0",
          annotations: {},
          imageInformation: { registry: "registry.io", repository: "app2", tag: "v1.0.0", digest: "sha256:b" },
          type: "Deployment"
        }
      ];

      mockOrchestratorService.listeApplications.mockResolvedValue(apps);
      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:a" }
      ]);

      const spyProcessApplication = vi.spyOn(service, "processApplication");

      await service.processImageWatcher();

      expect(mockOrchestratorService.listeApplications).toHaveBeenCalled();
      expect(spyProcessApplication).toHaveBeenCalledTimes(1);
    });
  });

  describe("processApplication()", () => {
    const createApp = (overrides: Partial<Application> = {}): Application => ({
      namespace: "test",
      name: "app",
      image: "registry.io/repo:v1.0.0",
      annotations: {
        [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL
      },
      imageInformation: {
        registry: "registry.io",
        repository: "repo",
        tag: "v1.0.0",
        digest: "sha256:abc123",
      },
      type: "Deployment",
      ...overrides
    });

    it("ignore les applications en mode DISABLED", async () => {
      const app = createApp({
        annotations: { [TypeAnnotation.MODE]: TypeMode.DISABLED }
      });

      await service.processApplication(app);

      expect(mockRegistryService.getListeTags).not.toHaveBeenCalled();
    });

    it("ne fait rien si aucune nouvelle version n'est disponible", async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v0.9.0", digest: "sha256:def456" }
      ]);

      await service.processApplication(app);

      expect(mockRegistryService.getListeTags).toHaveBeenCalled();
      expect(mockOrchestratorService.patchApplication).not.toHaveBeenCalled();
    });

    it("met à jour automatiquement en mode AUTO_UPDATE", async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.1.0", digest: "sha256:def456" }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: "v1.1.0",
        changelog: "New features",
        url: "https://github.com/repo/releases/v1.1.0",
        publishedAt: new Date("2024-01-01")
      });

      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      await service.processApplication(app);

      expect(mockReleaseService.getRelease).toHaveBeenCalledWith(
        "repo",
        "v1.1.0",
        expect.any(Object)
      );
      expect(mockAIService.ask).toHaveBeenCalled();
      expect(mockNotificationService.broadcast).toHaveBeenCalled();
      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          [TypeAnnotation.CURRENT_VERSION]: "v1.1.0",
          [TypeAnnotation.PREVIOUS_VERSION]: "v1.0.0"
        }),
        "registry.io/repo:v1.1.0"
      );
    });

    it("envoie une notification en mode NOTIFICATION", async () => {
      const app = createApp({
        annotations: { [TypeAnnotation.MODE]: TypeMode.NOTIFICATION }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.1.0", digest: "sha256:def456" }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: "v1.1.0",
        changelog: "New features",
        url: "https://github.com/repo/releases/v1.1.0",
        publishedAt: new Date("2024-01-01")
      });

      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      await service.processApplication(app);

      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          [TypeAnnotation.LAST_NOTIFIED]: expect.any(Date),
          [TypeAnnotation.LAST_NOTIFIED_VERSION]: "v1.1.0",
          [TypeAnnotation.TOKEN_UPDATE]: expect.any(String)
        })
      );

      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("Déployer la version v1.1.0")
        ]),
        expect.any(Object)
      );
    });

    it("respecte la stratégie PATCH", async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
          [TypeAnnotation.STRATEGY]: TypeStrategy.PATCH
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.0.1", digest: "sha256:def456" },
        { tag: "v1.1.0", digest: "sha256:ghi789" },
        { tag: "v2.0.0", digest: "sha256:jkl012" }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: "v1.0.1",
        changelog: "Bugfixes",
        url: "https://github.com/repo/releases/v1.0.1",
        publishedAt: new Date("2024-01-01")
      });

      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      await service.processApplication(app);

      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          [TypeAnnotation.CURRENT_VERSION]: "v1.0.1"
        }),
        "registry.io/repo:v1.0.1"
      );
    });

    it("respecte la stratégie MINOR", async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MINOR
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.0.1", digest: "sha256:def456" },
        { tag: "v1.1.0", digest: "sha256:ghi789" },
        { tag: "v2.0.0", digest: "sha256:jkl012" }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: "v1.1.0",
        changelog: "New features",
        url: "https://github.com/repo/releases/v1.1.0",
        publishedAt: new Date("2024-01-01")
      });

      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      await service.processApplication(app);

      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          [TypeAnnotation.CURRENT_VERSION]: "v1.1.0"
        }),
        "registry.io/repo:v1.1.0"
      );
    });

    it("respecte la stratégie MAJOR", async () => {
      const app = createApp({
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MAJOR
        }
      });

      mockRegistryService.getListeTags.mockResolvedValue([
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.0.1", digest: "sha256:def456" },
        { tag: "v1.1.0", digest: "sha256:ghi789" },
        { tag: "v2.0.0", digest: "sha256:jkl012" }
      ]);

      mockReleaseService.getRelease.mockResolvedValue({
        version: "v2.0.0",
        changelog: "Breaking changes",
        url: "https://github.com/repo/releases/v2.0.0",
        publishedAt: new Date("2024-01-01")
      });

      mockOrchestratorService.patchApplication.mockResolvedValue(true);

      await service.processApplication(app);

      expect(mockOrchestratorService.patchApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          [TypeAnnotation.CURRENT_VERSION]: "v2.0.0"
        }),
        "registry.io/repo:v2.0.0"
      );
    });

    it("gère les erreurs gracieusement", async () => {
      const app = createApp();

      mockRegistryService.getListeTags.mockRejectedValue(new Error("Network error"));

      await expect(service.processApplication(app)).resolves.toBeUndefined();
    });
  });

  describe("parseAnnotation()", () => {
    it("retourne la valeur de l'annotation directement", () => {
      const annotations = { [TypeAnnotation.MODE]: TypeMode.NOTIFICATION };
      const result = service["parseAnnotation"](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it("retourne la valeur en minuscule si elle existe", () => {
      const annotations = { "image-watcher.mode": TypeMode.AUTO_UPDATE };
      const result = service["parseAnnotation"](annotations, "image-watcher.mode" as TypeAnnotation);

      expect(result).toBe(TypeMode.AUTO_UPDATE);
    });

    it("retourne la valeur par défaut si aucune valeur n'est fournie", () => {
      const result = service["parseAnnotation"]({}, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.AUTO_UPDATE);
    });

    it("retourne la valeur de l'environnement si fournie", () => {
      const result = service["parseAnnotation"]({}, TypeAnnotation.MODE, TypeMode.DISABLED);

      expect(result).toBe(TypeMode.DISABLED);
    });

    it("valide les options et retourne la valeur en majuscules", () => {
      const annotations = { [TypeAnnotation.MODE]: "notification" };
      const result = service["parseAnnotation"](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.NOTIFICATION);
    });

    it("retourne la valeur par défaut si l'option n'est pas valide", () => {
      const annotations = { [TypeAnnotation.MODE]: "invalid-mode" };
      const result = service["parseAnnotation"](annotations, TypeAnnotation.MODE);

      expect(result).toBe(TypeMode.AUTO_UPDATE);
    });
  });

  describe("hasImageWatcher()", () => {
    it("retourne true si une annotation image-watcher existe", () => {
      const annotations = { "image-watcher.mode": "auto-update" };
      const result = service["hasImageWatcher"](annotations);

      expect(result).toBe(true);
    });

    it("retourne false si aucune annotation image-watcher n'existe", () => {
      const annotations = { "other-annotation": "value" };
      const result = service["hasImageWatcher"](annotations);

      expect(result).toBe(false);
    });

    it("est insensible à la casse", () => {
      const annotations = { "IMAGE-WATCHER.MODE": "auto-update" };
      const result = service["hasImageWatcher"](annotations);

      expect(result).toBe(true);
    });
  });

  describe("getCurrentVersion()", () => {
    const createWatchedApp = (tag: string, digest?: string): WatchedApplication => ({
      namespace: "test",
      name: "app",
      image: `registry.io/repo:${tag}`,
      annotations: {},
      imageInformation: {
        registry: "registry.io",
        repository: "repo",
        tag,
        digest: digest || "sha256:abc123"
      },
      parsedAnnotations: {
        [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL
      },
      hasImageWatcher: true,
      type: "Deployment"
    });

    it("retourne le tag si c'est une version semver", async () => {
      const app = createWatchedApp("v1.0.0");
      const result = await service["getCurrentVersion"](app);

      expect(result).toBe("v1.0.0");
    });

    it("retourne la version annotée si présente", async () => {
      const app = createWatchedApp("latest");
      app.parsedAnnotations[TypeAnnotation.CURRENT_VERSION] = "v1.5.0";

      const result = await service["getCurrentVersion"](app);

      expect(result).toBe("v1.5.0");
    });

    it("trouve la version par digest", async () => {
      const app = createWatchedApp("latest", "sha256:specific");
      const tags = [
        { tag: "v1.0.0", digest: "sha256:abc123" },
        { tag: "v1.1.0", digest: "sha256:specific" }
      ];

      const result = await service["getCurrentVersion"](app, tags);

      expect(result).toBe("v1.1.0");
    });

    it("retourne null si aucun tag correspondant n'est trouvé", async () => {
      const app = createWatchedApp("latest");
      const tags = [
        { tag: "v1.0.0", digest: "sha256:other" }
      ];

      const result = await service["getCurrentVersion"](app, tags);

      expect(result).toBeNull();
    });

    it("prioritise les versions sans suffix", async () => {
      const app = createWatchedApp("latest", "sha256:multi");
      const tags = [
        { tag: "v1.0.0-beta", digest: "sha256:multi" },
        { tag: "v1.0.0", digest: "sha256:multi" },
        { tag: "v1.0.0-rc1", digest: "sha256:multi" }
      ];

      const result = await service["getCurrentVersion"](app, tags);

      expect(result).toBe("v1.0.0");
    });
  });

  describe("toWatchedApplication()", () => {
    it("enrichit une application avec les annotations parsées", () => {
      const app: Application = {
        namespace: "test",
        name: "app",
        image: "registry.io/repo:v1.0.0",
        annotations: {
          [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
          [TypeAnnotation.STRATEGY]: TypeStrategy.MINOR
        },
        imageInformation: {
          registry: "registry.io",
          repository: "repo",
          tag: "v1.0.0",
          digest: "sha256:abc123"
        },
        type: "Deployment"
      };

      const result = service["toWatchedApplication"](app);

      expect(result.hasImageWatcher).toBe(true);
      expect(result.parsedAnnotations[TypeAnnotation.MODE]).toBe(TypeMode.NOTIFICATION);
      expect(result.parsedAnnotations[TypeAnnotation.STRATEGY]).toBe(TypeStrategy.MINOR);
    });

    it("gère les applications sans annotations", () => {
      const app: Application = {
        namespace: "test",
        name: "app",
        image: "registry.io/repo:v1.0.0",
        annotations: {},
        imageInformation: {
          registry: "registry.io",
          repository: "repo",
          tag: "v1.0.0",
          digest: "sha256:abc123"
        },
        type: "Deployment"
      };

      const result = service["toWatchedApplication"](app);

      expect(result.hasImageWatcher).toBe(false);
      expect(result.parsedAnnotations[TypeAnnotation.MODE]).toBe(TypeMode.AUTO_UPDATE);
    });
  });

  describe("getAnnotations()", () => {
    it("parse toutes les annotations correctement", () => {
      const now = new Date();
      const annotations = {
        [TypeAnnotation.MODE]: TypeMode.NOTIFICATION,
        [TypeAnnotation.STRATEGY]: TypeStrategy.PATCH,
        [TypeAnnotation.CURRENT_VERSION]: "v1.5.0",
        [TypeAnnotation.PREVIOUS_VERSION]: "v1.4.0",
        [TypeAnnotation.LAST_UPDATED]: now.toISOString(),
        [TypeAnnotation.LAST_NOTIFIED]: now.toISOString(),
        [TypeAnnotation.TOKEN_UPDATE]: "test-token",
        [TypeAnnotation.RELEASE_URL]: "https://github.com/repo"
      };

      const result = service["getAnnotations"](annotations);

      expect(result[TypeAnnotation.MODE]).toBe(TypeMode.NOTIFICATION);
      expect(result[TypeAnnotation.STRATEGY]).toBe(TypeStrategy.PATCH);
      expect(result[TypeAnnotation.CURRENT_VERSION]).toBe("v1.5.0");
      expect(result[TypeAnnotation.LAST_UPDATED]).toBeInstanceOf(Date);
      expect(result[TypeAnnotation.TOKEN_UPDATE]).toBe("test-token");
    });
  });
});
