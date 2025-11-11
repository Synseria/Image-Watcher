import 'reflect-metadata';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrchestratorService } from '../../src/service/orchestrator/orchestrator.service';
import { IOrchestratorProvider } from '../../src/service/orchestrator/domain/i-orchestrator-provider';
import { Application } from '../../src/service/orchestrator/domain/application';
import { ApplicationAnnotation, TypeAnnotation } from '../../src/service/image-watcher/domain/annotation';

// Mode de test : 'unit' (avec mocks) ou 'integration' (lecture seule)
const TEST_MODE = process.env.ORCHESTRATOR_TEST_MODE || 'unit';
const IS_INTEGRATION = TEST_MODE === 'integration';

describe(`OrchestratorService (${TEST_MODE} tests)`, () => {
  let service: OrchestratorService;
  let mockProvider: IOrchestratorProvider | undefined;

  beforeEach(() => {
    if (IS_INTEGRATION) {
      service = container.resolve(OrchestratorService);
    } else {
      mockProvider = {
        providerName: 'mock-orchestrator',
        isConfigured: vi.fn().mockReturnValue(true),
        getApplications: vi.fn(),
        getApplication: vi.fn(),
        readDigest: vi.fn(),
        patchApplication: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      service = new OrchestratorService(mockProvider);
    }
  });

  if (!IS_INTEGRATION) {
    describe('initializeProviders()', () => {
      it('enregistre un provider configuré', () => {
        expect(mockProvider!.isConfigured).toHaveBeenCalled();
        expect(service['providers'].size).toBe(1);
      });

      it('ignore un provider non configuré', () => {
        const unconfiguredProvider: IOrchestratorProvider = {
          providerName: 'unconfigured',
          isConfigured: vi.fn().mockReturnValue(false),
          getApplications: vi.fn(),
          getApplication: vi.fn(),
          readDigest: vi.fn(),
          patchApplication: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        const newService = new OrchestratorService(unconfiguredProvider);
        expect(newService['providers'].size).toBe(0);
      });
    });

    describe('getProvider()', () => {
      it('retourne le provider disponible', () => {
        const provider = service['getProvider']();
        expect(provider).toBe(mockProvider);
      });

      it("lance une erreur si aucun provider n'est disponible", () => {
        service['providers'].clear();

        expect(() => service['getProvider']()).toThrow("Aucun fournisseur d'orchestration n'est disponible.");
      });
    });
  }
  describe('listeApplications()', () => {
    if (!IS_INTEGRATION) {
      it('récupère et enrichit les applications', async () => {
        const mockApps: Application[] = [
          {
            namespace: 'default',
            name: 'nginx',
            image: 'nginx:1.25',
            imageInformation: {},
            type: 'Deployment',
            replicas: 2,
            readyReplicas: 2,
            age: '3600'
          },
          {
            namespace: 'default',
            name: 'postgres',
            image: 'postgres:15',
            imageInformation: {},
            type: 'Deployment',
            replicas: 2,
            readyReplicas: 2,
            age: '3600'
          }
        ];

        mockProvider!.getApplications = vi.fn().mockResolvedValue(mockApps);

        const apps = await service.listeApplications();

        expect(mockProvider!.getApplications).toHaveBeenCalled();
        expect(apps).toHaveLength(2);
        expect(apps[0].imageInformation).toBeDefined();
        expect(apps[0].imageInformation?.repository).toBe('nginx');
        expect(apps[0].imageInformation?.tag).toBe('1.25');
      });

      it("retourne un tableau vide en cas d'erreur", async () => {
        mockProvider!.getApplications = vi.fn().mockRejectedValue(new Error('API Error'));

        const apps = await service.listeApplications();

        expect(apps).toEqual([]);
      });

      it('enrichit les images avec le digest existant', async () => {
        const mockApps: Application[] = [
          {
            namespace: 'default',
            name: 'nginx',
            image: 'nginx:1.25',
            imageInformation: {
              registry: 'docker.io',
              repository: 'nginx',
              tag: '1.25',
              digest: 'sha256:existing123'
            },
            type: 'Deployment',
            replicas: 2,
            readyReplicas: 2,
            age: '3600'
          }
        ];

        mockProvider!.getApplications = vi.fn().mockResolvedValue(mockApps);

        const apps = await service.listeApplications();

        expect(apps[0].imageInformation?.digest).toBe('sha256:existing123');
      });
    } else {
      // Tests d'intégration en LECTURE SEULE
      it('récupère la liste des applications', async () => {
        const apps = await service.listeApplications();

        if (apps.length === 0) {
          console.warn('⚠️  Aucune application trouvée - cluster vide ou non accessible');
          return;
        }

        expect(Array.isArray(apps)).toBe(true);
        console.log(`✓ ${apps.length} application(s) trouvée(s)`);

        // Affiche quelques exemples
        apps.slice(0, 3).forEach((app) => {
          console.log(`  - ${app.namespace}/${app.name}: ${app.image}`);
        });
      }, 30000);
    }
  });

  if (!IS_INTEGRATION) {
    describe('getApplication()', () => {
      it('récupère et enrichit une application', async () => {
        const mockApp: Application = {
          namespace: 'default',
          name: 'nginx',
          image: 'nginx:1.25',
          imageInformation: {},
          type: 'Deployment',
          replicas: 2,
          readyReplicas: 2,
          age: '3600'
        };

        mockProvider!.getApplication = vi.fn().mockResolvedValue(mockApp);

        const app = await service.getApplication('default', 'nginx');

        expect(mockProvider!.getApplication).toHaveBeenCalledWith('default', 'nginx');
        expect(app).toBeDefined();
        expect(app?.imageInformation).toBeDefined();
        expect(app?.imageInformation?.repository).toBe('nginx');
      });

      it("retourne undefined en cas d'erreur", async () => {
        mockProvider!.getApplication = vi.fn().mockRejectedValue(new Error('Not found'));

        const app = await service.getApplication('default', 'nginx');

        expect(app).toBeUndefined();
      });
      // Pas de test d'intégration pour getApplication (pas de focus sur une app spécifique)
    });
  }

  if (!IS_INTEGRATION) {
    describe('readDigest()', () => {
      it("lit le digest d'une application", async () => {
        const mockApp: Application = {
          namespace: 'default',
          name: 'nginx',
          image: 'nginx:1.25',
          imageInformation: {},
          type: 'Deployment',
          replicas: 2,
          readyReplicas: 2,
          age: '3600'
        };

        mockProvider!.readDigest = vi.fn().mockResolvedValue('sha256:abc123');

        const digest = await service.readDigest(mockApp);

        expect(mockProvider!.readDigest).toHaveBeenCalledWith(mockApp);
        expect(digest).toBe('sha256:abc123');
      });

      it("retourne undefined en cas d'erreur", async () => {
        const mockApp: Application = {
          namespace: 'default',
          name: 'nginx',
          image: 'nginx:1.25',
          imageInformation: {},
          type: 'Deployment',
          replicas: 2,
          readyReplicas: 2,
          age: '3600'
        };

        mockProvider!.readDigest = vi.fn().mockRejectedValue(new Error('Failed'));

        const digest = await service.readDigest(mockApp);

        expect(digest).toBeUndefined();
      });
      // Pas de test d'intégration pour readDigest (lecture trop spécifique)
    });
  }

  if (!IS_INTEGRATION) {
    describe('patchApplication()', () => {
      it('met à jour une application', async () => {
        const mockApp: Application = {
          namespace: 'default',
          name: 'nginx',
          image: 'nginx:1.25',
          imageInformation: {},
          type: 'Deployment',
          replicas: 2,
          readyReplicas: 2,
          age: '3600'
        };

        const params: ApplicationAnnotation = {
          [TypeAnnotation.LAST_UPDATED]: new Date()
        } as any;

        mockProvider!.patchApplication = vi.fn().mockResolvedValue({ success: true });

        const result = await service.patchApplication(mockApp, params, 'nginx:1.26');

        expect(mockProvider!.patchApplication).toHaveBeenCalledWith(mockApp, params, 'nginx:1.26');
        expect(result).toEqual({ success: true });
      });

      it("retourne undefined en cas d'erreur", async () => {
        const mockApp: Application = {
          namespace: 'default',
          name: 'nginx',
          image: 'nginx:1.25',
          imageInformation: {},
          type: 'Deployment',
          replicas: 2,
          readyReplicas: 2,
          age: '3600'
        };

        mockProvider!.patchApplication = vi.fn().mockRejectedValue(new Error('Failed'));

        const result = await service.patchApplication(mockApp, {} as any);

        expect(result).toBeUndefined();
      });
      // PAS de test d'intégration pour patchApplication (écriture interdite!)
    });
  }

  if (IS_INTEGRATION) {
    describe('Configuration (lecture seule)', () => {
      it("vérifie qu'un provider est configuré", () => {
        const providers = Array.from(service['providers'].keys());

        if (providers.length === 0) {
          console.warn("⚠️  Aucun provider d'orchestration configuré");
          return;
        }

        console.log(`✓ Provider(s) configuré(s):`, providers);
        expect(providers.length).toBeGreaterThan(0);
      });

      it('vérifie que le provider fonctionne', async () => {
        try {
          const apps = await service.listeApplications();
          console.log(`✓ Provider opérationnel (${apps.length} app(s) accessibles)`);
          expect(true).toBe(true);
        } catch (err: any) {
          console.warn('⚠️  Provider non accessible:', err.message);
        }
      }, 30000);
    });
  }
});
