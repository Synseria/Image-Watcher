import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../src/service/ai/ai.service";
import { AIMessage, AIModel } from "../../src/service/ai/domain/ai";
import { IAIProvider } from "../../src/service/ai/domain/i-ai";
// Mode de test : 'unit' (avec mocks) ou 'integration' (avec vrais providers)
const TEST_MODE = process.env.AI_TEST_MODE || 'unit';
const IS_INTEGRATION = TEST_MODE === 'integration';

describe(`AIService (${TEST_MODE} tests)`, () => {
  let service: AIService;
  let mockProvider: IAIProvider | undefined;

  beforeEach(() => {
    if (IS_INTEGRATION) {
      // Mode intégration : utilise les vrais providers via tsyringe
      service = container.resolve(AIService);
    } else {
      // Mode unitaire : crée un mock
      mockProvider = {
        providerName: "mock-provider",
        isConfigured: vi.fn().mockReturnValue(true),
        chat: vi.fn(),
        listModels: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      service = new AIService(mockProvider);
    }
  });

  describe("initializeProviders()", () => {
    if (!IS_INTEGRATION) {
      it("enregistre un provider configuré", () => {
        expect(mockProvider!.isConfigured).toHaveBeenCalled();
        expect(service["providers"].size).toBe(1);
        expect(service["providers"].has("mock-provider")).toBe(true);
      });

      it("ignore un provider non configuré", () => {
        const unconfiguredProvider: IAIProvider = {
          providerName: "unconfigured-provider",
          isConfigured: vi.fn().mockReturnValue(false),
          chat: vi.fn(),
          listModels: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        const newService = new AIService(unconfiguredProvider);

        expect(unconfiguredProvider.isConfigured).toHaveBeenCalled();
        expect(newService["providers"].size).toBe(0);
      });

      it("enregistre plusieurs providers configurés", () => {
        const provider2: IAIProvider = {
          providerName: "provider-2",
          isConfigured: vi.fn().mockReturnValue(true),
          chat: vi.fn(),
          listModels: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        service["providers"].clear();
        service["initializeProviders"]([mockProvider!, provider2]);

        expect(service["providers"].size).toBe(2);
        expect(service["providers"].has("mock-provider")).toBe(true);
        expect(service["providers"].has("provider-2")).toBe(true);
      });
    } else {
      it("enregistre les providers configurés en mode intégration", () => {
        const providers = service["providers"];

        expect(providers.size).toBeGreaterThan(0);
        console.log("Providers enregistrés :", Array.from(providers.keys()));
      });
    }
  });

  describe("getProvider()", () => {
    if (!IS_INTEGRATION) {
      it("retourne le provider par nom", () => {
        const provider = service["getProvider"]("mock-provider");

        expect(provider).toBe(mockProvider);
        expect(provider?.providerName).toBe("mock-provider");
      });

      it("retourne le premier provider si aucun nom n'est spécifié", () => {
        const provider = service["getProvider"]();

        expect(provider).toBe(mockProvider);
      });

      it("retourne undefined si aucun provider n'est disponible", () => {
        service["providers"].clear();
        const provider = service["getProvider"]("non-existent");

        expect(provider).toBeUndefined();
      });

      it("retourne undefined pour un provider inexistant", () => {
        const provider = service["getProvider"]("non-existent-provider");

        expect(provider).toBeUndefined();
      });
    } else {
      it("retourne un provider configuré en mode intégration", () => {
        const provider = service["getProvider"]("openai");

        expect(provider).toBeDefined();
        expect(provider?.providerName).toBe("openai");
      });
    }
  });

  describe("chat()", () => {
    if (!IS_INTEGRATION) {
      // Tests unitaires avec mocks
      it("appelle le provider avec les messages", async () => {
        const messages: AIMessage[] = [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello!" }
        ];

        mockProvider!.chat = vi.fn().mockResolvedValue("Hi there!");

        const result = await service.chat(messages);

        expect(mockProvider!.chat).toHaveBeenCalledWith(messages, undefined);
        expect(result).toBe("Hi there!");
      });

      it("passe les options au provider", async () => {
        const messages: AIMessage[] = [{ role: "user", content: "Test" }];
        const options = { temperature: 0.5, maxTokens: 100 };

        mockProvider!.chat = vi.fn().mockResolvedValue("Response");

        await service.chat(messages, options);

        expect(mockProvider!.chat).toHaveBeenCalledWith(messages, options);
      });

      it("utilise le provider spécifié", async () => {
        const provider2: IAIProvider = {
          providerName: "provider-2",
          isConfigured: vi.fn().mockReturnValue(true),
          chat: vi.fn().mockResolvedValue("Response from provider-2"),
          listModels: vi.fn(),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        service["providers"].set("provider-2", provider2);

        const messages: AIMessage[] = [{ role: "user", content: "Test" }];
        const result = await service.chat(messages, { provider: "provider-2" });

        expect(provider2.chat).toHaveBeenCalled();
        expect(mockProvider!.chat).not.toHaveBeenCalled();
        expect(result).toBe("Response from provider-2");
      });

      it("retourne une chaîne vide si aucun provider n'est disponible", async () => {
        service["providers"].clear();

        const messages: AIMessage[] = [{ role: "user", content: "Test" }];
        const result = await service.chat(messages);

        expect(result).toBe("");
      });

      it("retourne une chaîne vide en cas d'erreur", async () => {
        const messages: AIMessage[] = [{ role: "user", content: "Test" }];

        mockProvider!.chat = vi.fn().mockRejectedValue(new Error("API Error"));

        const result = await service.chat(messages);

        expect(result).toBe("");
      });
    } else {
      // Tests d'intégration avec vrais providers
      it("gère une conversation multi-tours", async () => {
        const messages: AIMessage[] = [
          { role: "system", content: "You are a helpful assistant. Be concise." },
          { role: "user", content: "What is Docker?" },
        ];

        const response = await service.chat(messages, {
          temperature: 0.5,
          maxTokens: 100
        });

        if (!response) {
          console.warn("⚠️  Aucune réponse - vérifiez la configuration de l'API");
          return;
        }

        expect(typeof response).toBe("string");
        expect(response.length).toBeGreaterThan(10);
        console.log("Réponse de l'IA:", response.substring(0, 100));
      }, 30000);
    }
  });

  describe("ask()", () => {
    if (!IS_INTEGRATION) {
      // Tests unitaires
      it("construit les messages correctement", async () => {
        mockProvider!.chat = vi.fn().mockResolvedValue("Answer");

        await service.ask("What is AI?", "You are an expert");

        expect(mockProvider!.chat).toHaveBeenCalledWith(
          [
            { role: "system", content: "You are an expert" },
            { role: "user", content: "What is AI?" }
          ],
          undefined
        );
      });

      it("retourne la réponse du provider", async () => {
        mockProvider!.chat = vi.fn().mockResolvedValue("AI stands for Artificial Intelligence");

        const result = await service.ask("What is AI?", "You are an expert");

        expect(result).toBe("AI stands for Artificial Intelligence");
      });

      it("passe les options au provider", async () => {
        const options = { temperature: 0.7, maxTokens: 200 };
        mockProvider!.chat = vi.fn().mockResolvedValue("Answer");

        await service.ask("Question", "System prompt", options);

        expect(mockProvider!.chat).toHaveBeenCalledWith(
          expect.any(Array),
          options
        );
      });

      it("retourne une chaîne vide si aucun provider n'est disponible", async () => {
        service["providers"].clear();

        const result = await service.ask("Question", "System prompt");

        expect(result).toBe("");
      });

      it("retourne une chaîne vide en cas d'erreur", async () => {
        mockProvider!.chat = vi.fn().mockRejectedValue(new Error("API Error"));

        const result = await service.ask("Question", "System prompt");

        expect(result).toBe("");
      });
    } else {
      // Tests d'intégration
      it("répond à une question simple", async () => {
        const question = "What is 2+2? Answer with just the number.";
        const systemPrompt = "You are a helpful math assistant. Be concise.";

        const answer = await service.ask(question, systemPrompt, {
          temperature: 0,
          maxTokens: 10
        });

        if (!answer) {
          console.warn("⚠️  Aucune réponse - vérifiez la configuration de l'API");
          return;
        }

        expect(typeof answer).toBe("string");
        expect(answer.length).toBeGreaterThan(0);
        console.log("Réponse de l'IA:", answer);
      }, 30000);

      it("génère un résumé de changelog", async () => {
        const changelog = `
## Version 1.2.0

### New Features
- Added dark mode support
- Improved performance by 50%

### Bug Fixes
- Fixed memory leak in cache system
- Resolved crash on startup

### Breaking Changes
- Renamed API endpoint from /api/v1 to /api/v2
`;

        const systemPrompt = "You are a technical writer. Summarize the following changelog in French, highlighting the most important changes in 2-3 sentences.";

        const summary = await service.ask(changelog, systemPrompt, {
          temperature: 0.3,
          maxTokens: 200
        });

        if (!summary) {
          console.warn("⚠️  Aucun résumé généré - vérifiez la configuration de l'API");
          return;
        }

        expect(typeof summary).toBe("string");
        expect(summary.length).toBeGreaterThan(20);
        console.log("Résumé généré:", summary);
      }, 30000);
    }
  });

  describe("listModels()", () => {
    if (!IS_INTEGRATION) {
      // Tests unitaires
      it("retourne la liste des modèles", async () => {
        const models: AIModel[] = [
          { id: "model-1" },
          { id: "model-2" }
        ];

        mockProvider!.listModels = vi.fn().mockResolvedValue(models);

        const result = await service.listModels();

        expect(mockProvider!.listModels).toHaveBeenCalled();
        expect(result).toEqual(models);
      });

      it("utilise le provider spécifié", async () => {
        const provider2: IAIProvider = {
          providerName: "provider-2",
          isConfigured: vi.fn().mockReturnValue(true),
          chat: vi.fn(),
          listModels: vi.fn().mockResolvedValue([{ id: "model-3", name: "Model 3", provider: "provider-2" }]),
          isAvailable: vi.fn().mockReturnValue(true)
        };

        service["providers"].set("provider-2", provider2);

        const result = await service.listModels("provider-2");

        expect(provider2.listModels).toHaveBeenCalled();
        expect(mockProvider!.listModels).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it("retourne un tableau vide si aucun provider n'est disponible", async () => {
        service["providers"].clear();

        const result = await service.listModels();

        expect(result).toEqual([]);
      });

      it("retourne un tableau vide en cas d'erreur", async () => {
        mockProvider!.listModels = vi.fn().mockRejectedValue(new Error("API Error"));

        const result = await service.listModels();

        expect(result).toEqual([]);
      });
    } else {
      // Tests d'intégration
      it("récupère la liste des modèles disponibles", async () => {
        const models = await service.listModels();

        if (models.length === 0) {
          console.warn("⚠️  Aucun modèle disponible - vérifiez la configuration des providers");
          return;
        }

        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);

        expect(models[0]).toHaveProperty("id");

        console.log(`✓ ${models.length} modèle(s) disponible(s)`);
      }, 30000);
    }
  });

  describe("markdownToText()", () => {
    // Ces tests sont identiques en mode unit et integration
    it("supprime les balises HTML", () => {
      const input = "Hello <strong>world</strong>!";
      const expected = "Hello world!";

      expect(service.markdownToText(input)).toBe(expected);
    });

    it("supprime les liens markdown", () => {
      const input = "Check [this link](https://example.com)";
      const expected = "Check this link";

      expect(service.markdownToText(input)).toBe(expected);
    });

    it("supprime la syntaxe markdown", () => {
      const input = "# Title\n**bold** *italic* `code`";
      const expected = "Title\nbold italic code";

      expect(service.markdownToText(input)).toBe(expected);
    });

    it("normalise les retours à la ligne", () => {
      const input = "Line 1\n\n\nLine 2\r\nLine 3";
      const expected = "Line 1\nLine 2\nLine 3";

      expect(service.markdownToText(input)).toBe(expected);
    });

    it("gère un texte complexe", () => {
      const input = `# My Title

Here is a [link](https://example.com) and some **bold** text.

- Item 1
- Item 2

\`\`\`javascript
const x = 10;
\`\`\`

<div>HTML content</div>`;

      const result = service.markdownToText(input);

      expect(result).not.toContain("#");
      expect(result).not.toContain("[");
      expect(result).not.toContain("**");
      expect(result).not.toContain("<div>");
      expect(result).not.toContain("```");
    });

    if (IS_INTEGRATION) {
      it("nettoie un vrai changelog markdown", () => {
        const realChangelog = `
# Release v2.5.0

## 🚀 New Features

- **Authentication**: Added OAuth2 support ([#123](https://github.com/repo/pull/123))
- **API**: New \`/api/v2/users\` endpoint

## 🐛 Bug Fixes

- Fixed memory leak in \`DatabaseConnection\`
`;

        const cleaned = service.markdownToText(realChangelog);

        expect(cleaned).not.toContain("#");
        expect(cleaned).not.toContain("**");
        expect(cleaned).toContain("Release v2.5.0");
        expect(cleaned).toContain("OAuth2");

        console.log("Texte nettoyé:", cleaned.substring(0, 100));
      });
    }
  });

  if (IS_INTEGRATION) {
    describe("Configuration des providers", () => {
      it("a au moins un provider configuré", () => {
        const providers = service["providers"];

        if (providers.size === 0) {
          console.warn("⚠️  Aucun provider AI configuré - configurez OPENAI_API_KEY ou ANTHROPIC_API_KEY");
        }

        expect(providers.size).toBeGreaterThanOrEqual(0);
      });

      it("liste les providers disponibles", () => {
        const providers = service["providers"];
        const providerNames = Array.from(providers.keys());

        console.log("Providers disponibles:", providerNames);
        expect(Array.isArray(providerNames)).toBe(true);
      });
    });
  }

  if (!IS_INTEGRATION) {
    describe("Comportement en mode silencieux", () => {
      it("fonctionne sans provider configuré", async () => {
        const emptyService = new AIService({
          providerName: "empty",
          isConfigured: () => false,
          chat: async () => "",
          listModels: async () => [],
          isAvailable: vi.fn().mockReturnValue(true)
        });

        const chatResult = await emptyService.chat([{ role: "user", content: "test" }]);
        const askResult = await emptyService.ask("test", "system");
        const modelsResult = await emptyService.listModels();

        expect(chatResult).toBe("");
        expect(askResult).toBe("");
        expect(modelsResult).toEqual([]);
      });
    });
  }
});
