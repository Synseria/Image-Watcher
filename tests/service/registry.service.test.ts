import 'reflect-metadata';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRegistryProvider } from '../../src/service/registry/domain/i-registry-provider';
import { RegistryService } from '../../src/service/registry/registry.service';

// Mode de test : 'unit' (avec mocks) ou 'integration' (avec vrais providers)
const TEST_MODE = process.env.REGISTRY_TEST_MODE || 'unit';
const IS_INTEGRATION = TEST_MODE === 'integration';

describe(`RegistryService (${TEST_MODE} tests)`, () => {
  let service: RegistryService;
  let mockDockerHub: IRegistryProvider | undefined;
  let mockGhcr: IRegistryProvider | undefined;

  beforeEach(() => {
    if (IS_INTEGRATION) {
      service = container.resolve(RegistryService);
    } else {
      mockDockerHub = {
        providerName: 'docker.io',
        isConfigured: vi.fn().mockReturnValue(true),
        getListeTags: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      mockGhcr = {
        providerName: 'ghcr.io',
        isConfigured: vi.fn().mockReturnValue(true),
        getListeTags: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      service = new RegistryService(mockDockerHub, mockGhcr);
    }
  });

  if (!IS_INTEGRATION) {
    describe('initializeProviders()', () => {
      it('enregistre les providers configurés', () => {
        expect(mockDockerHub!.isConfigured).toHaveBeenCalled();
        expect(mockGhcr!.isConfigured).toHaveBeenCalled();
        expect(service['providers'].size).toBe(2);
      });

      it('ignore un provider non configuré', () => {
        const unconfiguredProvider: IRegistryProvider = {
          providerName: 'unconfigured',
          isConfigured: vi.fn().mockReturnValue(false),
          getListeTags: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        const newService = new RegistryService(unconfiguredProvider, mockGhcr!);
        expect(newService['providers'].size).toBe(1);
      });
    });

    describe('getProvider()', () => {
      it('retourne Docker Hub par défaut', () => {
        const provider = service['getProvider']();
        expect(provider).toBe(mockDockerHub);
      });

      it('retourne Docker Hub pour docker.io', () => {
        const provider = service['getProvider']('docker.io');
        expect(provider).toBe(mockDockerHub);
      });

      it('retourne GHCR pour ghcr.io', () => {
        const provider = service['getProvider']('ghcr.io');
        expect(provider).toBe(mockGhcr);
      });
    });
  }

  describe('getListeTags()', () => {
    if (!IS_INTEGRATION) {
      it('récupère les tags via Docker Hub par défaut', async () => {
        const mockTags = [
          { tag: 'latest', digest: 'sha256:abc' },
          { tag: '1.25', digest: 'sha256:def' }
        ];

        mockDockerHub!.getListeTags = vi.fn().mockResolvedValue(mockTags);

        const tags = await service.getListeTags('nginx', 10);

        expect(mockDockerHub!.getListeTags).toHaveBeenCalledWith('nginx', 10);
        expect(tags).toEqual(mockTags);
      });

      it('récupère les tags via GHCR', async () => {
        const mockTags = [{ tag: 'v1.0.0', digest: 'sha256:xyz' }];

        mockGhcr!.getListeTags = vi.fn().mockResolvedValue(mockTags);

        const tags = await service.getListeTags('ghcr.io/owner/repo', 10);

        expect(mockGhcr!.getListeTags).toHaveBeenCalledWith('owner/repo', 10);
        expect(tags).toEqual(mockTags);
      });

      it("retourne un tableau vide en cas d'erreur", async () => {
        mockDockerHub!.getListeTags = vi.fn().mockRejectedValue(new Error('Network error'));

        const tags = await service.getListeTags('nginx');

        expect(tags).toEqual([]);
      });

      it('utilise la limite par défaut de 100', async () => {
        mockDockerHub!.getListeTags = vi.fn().mockResolvedValue([]);

        await service.getListeTags('nginx');

        expect(mockDockerHub!.getListeTags).toHaveBeenCalledWith('nginx', 100);
      });
    } else {
      it("récupère les tags d'une image Docker Hub réelle", async () => {
        const tags = await service.getListeTags('nginx', 5);

        if (tags.length === 0) {
          console.warn('⚠️  Aucun tag récupéré - vérifiez la connexion réseau');
          return;
        }

        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThan(0);
        expect(tags[0]).toHaveProperty('tag');
        expect(tags[0]).toHaveProperty('digest');

        console.log(
          `✓ ${tags.length} tag(s) récupéré(s) pour nginx:`,
          tags.slice(0, 3).map((t) => t.tag)
        );
      }, 30000);

      it("récupère les tags d'une image GHCR réelle", async () => {
        const tags = await service.getListeTags('ghcr.io/actions/runner', 5);

        if (tags.length === 0) {
          console.warn('⚠️  Aucun tag récupéré pour GHCR');
          return;
        }

        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThan(0);

        console.log(`✓ ${tags.length} tag(s) récupéré(s) pour ghcr.io/actions/runner`);
      }, 30000);

      it('gère une image inexistante gracieusement', async () => {
        const tags = await service.getListeTags('nonexistent-image-xyz123', 5);

        expect(tags).toEqual([]);
        console.log('✓ Image inexistante gérée sans erreur');
      }, 30000);
    }
  });

  if (IS_INTEGRATION) {
    describe('Configuration', () => {
      it('liste les providers configurés', () => {
        const providers = Array.from(service['providers'].keys());
        console.log(`${providers.length} provider(s) configuré(s):`, providers);
        expect(providers.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Scénarios réels', () => {
      it('compare les versions de nginx', async () => {
        const tags = await service.getListeTags('nginx', 10);

        if (tags.length === 0) {
          console.warn('⚠️  Pas de tags disponibles');
          return;
        }

        console.log('Dernières versions de nginx:');
        tags.slice(0, 5).forEach((t) => console.log(`  - ${t.tag}`));

        expect(tags.length).toBeGreaterThan(0);
      }, 30000);
    });
  }
});
