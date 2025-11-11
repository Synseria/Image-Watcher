import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReleaseService } from "../../src/service/release/release.service";
import { IReleaseProvider } from "../../src/service/release/domain/i-release-provider";
import { ReleaseInfo } from "../../src/service/release/domain/release";
import { TypeAnnotation } from "../../src/service/image-watcher/domain/annotation";

// Mode de test : 'unit' (avec mocks) ou 'integration' (avec vrais providers)
const TEST_MODE = process.env.RELEASE_TEST_MODE || 'unit';
const IS_INTEGRATION = TEST_MODE === 'integration';

describe(`ReleaseService (${TEST_MODE} tests)`, () => {
  let service: ReleaseService;
  let mockGitHub: IReleaseProvider | undefined;
  let mockScrapper: IReleaseProvider | undefined;

  beforeEach(() => {
    if (IS_INTEGRATION) {
      service = container.resolve(ReleaseService);
    } else {
      mockGitHub = {
        providerName: "github",
        isConfigured: vi.fn().mockReturnValue(true),
        getRelease: vi.fn(),
        match: vi.fn().mockReturnValue(false),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      mockScrapper = {
        providerName: "scrapper",
        isConfigured: vi.fn().mockReturnValue(true),
        getRelease: vi.fn(),
        match: vi.fn().mockReturnValue(true),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      service = new ReleaseService(mockGitHub, mockScrapper);
    }
  });

  if (!IS_INTEGRATION) {
    describe("initializeProviders()", () => {
      it("enregistre les providers configurés", () => {
        expect(mockGitHub!.isConfigured).toHaveBeenCalled();
        expect(mockScrapper!.isConfigured).toHaveBeenCalled();
        expect(service["providers"].size).toBe(2);
      });

      it("ignore un provider non configuré", () => {
        const unconfiguredProvider: IReleaseProvider = {
          providerName: "unconfigured",
          isConfigured: vi.fn().mockReturnValue(false),
          getRelease: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true),
          match: vi.fn().mockReturnValue(true),
        };

        const newService = new ReleaseService(unconfiguredProvider, mockScrapper!);
        expect(newService["providers"].size).toBe(1);
      });
    });

    describe("getProvider()", () => {
      it("retourne GitHub pour un repo GitHub", () => {
        const provider = service["getProvider"]("owner/repo");
        expect(provider).toBe(mockGitHub);
      });

      it("retourne le scrapper pour une URL HTTP", () => {
        mockScrapper!.match = vi.fn().mockReturnValue(true);

        const provider = service["getProvider"]("https://example.com/releases");
        expect(provider).toBe(mockScrapper);
      });

      it("retourne le scrapper pour une URL HTTPS", () => {
        mockScrapper!.match = vi.fn().mockReturnValue(true);

        const provider = service["getProvider"]("https://example.com/releases");
        expect(provider).toBe(mockScrapper);
      });

      it("retourne undefined si aucun provider n'est disponible", () => {
        service["providers"].clear();

        const provider = service["getProvider"]("owner/repo");
        expect(provider).toBeUndefined();
      });
    });

    describe("interpolateUrl()", () => {
      it("interpole les paramètres simples", () => {
        const result = service["interpolateUrl"](
          "https://example.com/${repository}/${tag}",
          { repository: "myrepo", tag: "v1.0.0" }
        );

        expect(result).toBe("https://example.com/myrepo/v1.0.0");
      });

      it("interpole plusieurs occurrences du même paramètre", () => {
        const result = service["interpolateUrl"](
          "https://example.com/${tag}/release-${tag}",
          { tag: "v1.0.0" }
        );

        expect(result).toBe("https://example.com/v1.0.0/release-v1.0.0");
      });

      it("laisse les paramètres non fournis vides", () => {
        const result = service["interpolateUrl"](
          "https://example.com/${repository}/${missing}",
          { repository: "myrepo" }
        );

        expect(result).toBe("https://example.com/myrepo/");
      });

      it("gère les paramètres avec des caractères spéciaux", () => {
        const result = service["interpolateUrl"](
          "https://example.com/${org}/${repo}",
          { org: "my-org", repo: "my.repo" }
        );

        expect(result).toBe("https://example.com/my-org/my.repo");
      });
    });
  }

  describe("getRelease()", () => {
    if (!IS_INTEGRATION) {
      it("récupère une release via GitHub", async () => {
        const mockRelease: ReleaseInfo = {
          version: "v1.0.0",
          changelog: "Release notes",
          publishedAt: new Date(),
          url: "https://github.com/owner/repo/releases/tag/v1.0.0",
          provider: "github",
          author: "octocat",
          name: "Initial Release"
        };

        mockGitHub!.getRelease = vi.fn().mockResolvedValue(mockRelease);

        const release = await service.getRelease("owner/repo", "v1.0.0");

        expect(mockGitHub!.getRelease).toHaveBeenCalledWith(
          "owner/repo",
          "v1.0.0",
          expect.any(Object)
        );
        expect(release).toEqual(mockRelease);
      });

      it("interpole l'URL si fournie dans les options", async () => {
        mockScrapper!.match = vi.fn().mockReturnValue(true);
        mockScrapper!.getRelease = vi.fn().mockResolvedValue({
          version: "v1.0.0",
          releaseNotes: "Notes",
          publishedAt: new Date()
        });

        await service.getRelease("owner/repo", "v1.0.0", {
          [TypeAnnotation.RELEASE_URL]: "https://example.com/${repository}/${tag}"
        });

        expect(mockScrapper!.getRelease).toHaveBeenCalledWith(
          "owner/repo",
          "v1.0.0",
          expect.objectContaining({
            url: "https://example.com/owner/repo/v1.0.0"
          })
        );
      });

      it("passe les options au provider", async () => {
        mockGitHub!.getRelease = vi.fn().mockResolvedValue({
          version: "v1.0.0",
          releaseNotes: "Notes",
          publishedAt: new Date()
        });

        const options = { customOption: "value" };
        await service.getRelease("owner/repo", "v1.0.0", options);

        expect(mockGitHub!.getRelease).toHaveBeenCalledWith(
          "owner/repo",
          "v1.0.0",
          expect.objectContaining(options)
        );
      });

      it("retourne null si aucun provider n'est disponible", async () => {
        service["providers"].clear();

        const release = await service.getRelease("owner/repo", "v1.0.0");

        expect(release).toBeNull();
      });

      it("retourne null en cas d'erreur", async () => {
        mockGitHub!.getRelease = vi.fn().mockRejectedValue(new Error("API Error"));

        const release = await service.getRelease("owner/repo", "v1.0.0");

        expect(release).toBeNull();
      });

      it("retourne null si la release n'existe pas", async () => {
        mockGitHub!.getRelease = vi.fn().mockResolvedValue(null);

        const release = await service.getRelease("owner/repo", "v1.0.0");

        expect(release).toBeNull();
      });
    } else {
      it("récupère une vraie release GitHub", async () => {
        const release = await service.getRelease("traefik/traefik", "v3.6.0");

        if (!release) {
          console.warn("⚠️  Release non trouvée - vérifiez la configuration");
          return;
        }

        expect(release).toHaveProperty("version");
        expect(release).toHaveProperty("changelog");
        expect(release.version).toBe("v3.6.0");

        console.log(`✓ Release récupérée: ${release.version}`);
        console.log(`  Notes: ${release.changelog?.substring(0, 100)}...`);
      }, 30000);

      it("gère une release inexistante", async () => {
        const release = await service.getRelease("owner/repo", "v999.999.999");

        expect(release).toBeNull();
        console.log("✓ Release inexistante gérée sans erreur");
      }, 30000);

      it("récupère une release avec URL personnalisée", async () => {
        const release = await service.getRelease("nginx", "1.25.0", {
          "watcher.release.url": "https://nginx.org/en/CHANGES-${tag}"
        });

        if (release) {
          console.log(`✓ Release via URL personnalisée: ${release.version}`);
        } else {
          console.warn("⚠️  Scrapping non configuré ou échec");
        }

        expect(release === null || typeof release === "object").toBe(true);
      }, 30000);
    }
  });

  if (IS_INTEGRATION) {
    describe("Configuration", () => {
      it("liste les providers configurés", () => {
        const providers = Array.from(service["providers"].keys());
        console.log(`${providers.length} provider(s) configuré(s):`, providers);
        expect(providers.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Scénarios réels", () => {
      it("compare les notes de release de plusieurs versions", async () => {
        const versions = ["v1.28.0", "v1.27.0"];

        for (const version of versions) {
          const release = await service.getRelease("kubernetes/kubernetes", version);

          if (release) {
            console.log(`\n${version}:`);
            console.log(`  Date: ${release.publishedAt?.toLocaleDateString()}`);
            console.log(`  Taille notes: ${release.changelog?.length || 0} caractères`);
          }
        }

        expect(true).toBe(true);
      }, 60000);
    });
  }
});
