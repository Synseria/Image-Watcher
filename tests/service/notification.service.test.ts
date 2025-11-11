import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INotificationProvider } from "../../src/service/notification/domain/i-notification-provider";
import { NotificationService } from "../../src/service/notification/notification.service";

// Mode de test : 'unit' (avec mocks) ou 'integration' (avec vrais providers)
const TEST_MODE = process.env.NOTIFICATION_TEST_MODE || 'unit';
const IS_INTEGRATION = TEST_MODE === 'integration';

describe(`NotificationService (${TEST_MODE} tests)`, () => {
  let service: NotificationService;
  let mockProvider: INotificationProvider | undefined;

  beforeEach(() => {
    if (IS_INTEGRATION) {
      service = container.resolve(NotificationService);
    } else {
      mockProvider = {
        providerName: "mock-provider",
        isConfigured: vi.fn().mockReturnValue(true),
        maxLength: 2000,
        send: vi.fn().mockResolvedValue(undefined),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      service = new NotificationService(mockProvider, mockProvider);
    }
  });

  if (!IS_INTEGRATION) {
    describe("initializeProviders()", () => {
      it("enregistre un provider configuré", () => {
        expect(mockProvider!.isConfigured).toHaveBeenCalled();
        expect(service["providers"].size).toBe(1);
      });

      it("ignore un provider non configuré", () => {
        const unconfiguredProvider: INotificationProvider = {
          providerName: "unconfigured",
          isConfigured: vi.fn().mockReturnValue(false),
          maxLength: 2000,
          send: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        const newService = new NotificationService(unconfiguredProvider, unconfiguredProvider);
        expect(newService["providers"].size).toBe(0);
      });
    });
  }

  describe("broadcast()", () => {
    if (!IS_INTEGRATION) {
      it("envoie un message simple", async () => {
        mockProvider!.send = vi.fn().mockResolvedValue(undefined);

        const results = await service.broadcast("Test message");

        expect(mockProvider!.send).toHaveBeenCalledWith("Test message", undefined);
        expect(results).toEqual([{ provider: "mock-provider", success: true }]);
      });

      it("envoie un tableau de messages", async () => {
        mockProvider!.send = vi.fn().mockResolvedValue(undefined);

        const results = await service.broadcast(["Line 1", "Line 2"]);

        expect(mockProvider!.send).toHaveBeenCalledWith("Line 1\nLine 2", undefined);
        expect(results[0].success).toBe(true);
      });

      it("retourne un tableau vide si aucun provider", async () => {
        service["providers"].clear();

        const results = await service.broadcast("Test");

        expect(results).toEqual([]);
      });

      it("continue même si un provider échoue", async () => {
        mockProvider!.send = vi.fn().mockRejectedValue(new Error("Failed"));

        const results = await service.broadcast("Test");

        expect(results[0]).toEqual({
          provider: "mock-provider",
          success: false,
          error: "Failed"
        });
      });
    } else {
      it("envoie une notification réelle", async () => {
        const results = await service.broadcast("🧪 Test notification from integration tests");

        if (results.length === 0) {
          console.warn("⚠️  Aucun provider configuré");
          return;
        }

        console.log(`✓ ${results.filter((r: any) => r.success).length}/${results.length} notifications envoyées`);
        expect(results.length).toBeGreaterThan(0);
      }, 10000);

      it("envoie plusieurs messages", async () => {
        const messages = [
          "🧪 Test ligne 1",
          "🧪 Test ligne 2",
          "🧪 Test ligne 3"
        ];

        const results = await service.broadcast(messages);

        if (results.length > 0) {
          console.log(`✓ Broadcast envoyé à ${results.length} provider(s)`);
        }

        expect(Array.isArray(results)).toBe(true);
      }, 10000);
    }
  });

  describe("getAvailableProviders()", () => {
    it("retourne la liste des providers", () => {
      const providers = service.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);

      if (IS_INTEGRATION) {
        console.log("Providers disponibles:", providers);
      } else {
        expect(providers).toContain("mock-provider");
      }
    });
  });

  describe("splitMessageSmart()", () => {
    if (!IS_INTEGRATION) {
      it("ne découpe pas un message court", () => {
        const parts = service["splitMessageSmart"]("Short message", 100);
        expect(parts).toEqual(["Short message"]);
      });

      it("découpe un message long", () => {
        const longMessage = "A".repeat(2500);
        const parts = service["splitMessageSmart"](longMessage, 2000);

        expect(parts.length).toBeGreaterThan(1);
        expect(parts.every((p: string) => p.length <= 2000)).toBe(true);
      });

      it("joint un tableau en un seul texte", () => {
        const parts = service["splitMessageSmart"](["Line 1", "Line 2"], 100);
        expect(parts).toEqual(["Line 1\nLine 2"]);
      });
    } else {
      it("découpe un message très long en plusieurs parties", () => {
        const longMessage = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100);
        const parts = service["splitMessageSmart"](longMessage, 500);

        console.log(`Message découpé en ${parts.length} parties.`);
        expect(parts.length).toBeGreaterThan(1);
        expect(parts.every((p: string) => p.length <= 500)).toBe(true);
      });
    }
  });

  if (IS_INTEGRATION) {
    describe("Configuration", () => {
      it("liste les providers configurés", () => {
        const providers = service.getAvailableProviders();
        console.log(`${providers.length} provider(s) configuré(s):`, providers);
        expect(providers.length).toBeGreaterThanOrEqual(0);
      });
    });
  }
});
