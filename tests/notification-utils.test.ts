import { describe, expect, it } from "vitest";
import { shouldSendNotification } from "../src/utils/notification-utils";
import { parseSemver } from "../src/utils/semver-utils";

describe("shouldSendNotification()", () => {
  const availableVersions = [
    parseSemver("1.1.0")!,
    parseSemver("1.2.0")!,
    parseSemver("2.0.0")!
  ];

  describe("Première notification (pas d'historique)", () => {
    it("retourne toutes les versions si aucune notification précédente", () => {
      const result = shouldSendNotification(
        undefined,
        undefined,
        availableVersions
      );

      expect(result.newVersions).toEqual(availableVersions);
      expect(result.shouldRemind).toBe(false);
    });

    it("retourne toutes les versions si lastNotified est undefined", () => {
      const result = shouldSendNotification(
        undefined,
        "1.0.0",
        availableVersions
      );

      expect(result.newVersions).toEqual(availableVersions);
      expect(result.shouldRemind).toBe(false);
    });

    it("retourne toutes les versions si lastNotifiedVersion est undefined", () => {
      const result = shouldSendNotification(
        new Date(),
        undefined,
        availableVersions
      );

      expect(result.newVersions).toEqual(availableVersions);
      expect(result.shouldRemind).toBe(false);
    });
  });

  describe("Filtrage des nouvelles versions", () => {
    it("filtre les versions plus récentes que la dernière notifiée", () => {
      const lastNotified = new Date();
      const result = shouldSendNotification(
        lastNotified,
        "1.1.0",
        availableVersions
      );

      expect(result.newVersions.length).toBe(2);
      expect(result.newVersions.find(v => v.original === "1.2.0")).toBeDefined();
      expect(result.newVersions.find(v => v.original === "2.0.0")).toBeDefined();
      expect(result.newVersions.find(v => v.original === "1.1.0")).toBeUndefined();
    });

    it("retourne un tableau vide si aucune version plus récente", () => {
      const lastNotified = new Date();
      const result = shouldSendNotification(
        lastNotified,
        "2.0.0",
        availableVersions
      );

      expect(result.newVersions).toEqual([]);
    });

    it("ignore la dernière version notifiée", () => {
      const lastNotified = new Date();
      const result = shouldSendNotification(
        lastNotified,
        "1.2.0",
        availableVersions
      );

      expect(result.newVersions.length).toBe(1);
      expect(result.newVersions[0].original).toBe("2.0.0");
    });
  });

  describe("Calcul du délai de rappel", () => {
    it("shouldRemind=true si 7+ jours depuis la dernière notification", () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = shouldSendNotification(
        sevenDaysAgo,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(true);
    });

    it("shouldRemind=false si moins de 7 jours", () => {
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const result = shouldSendNotification(
        sixDaysAgo,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(false);
    });

    it("shouldRemind=false si notification aujourd'hui", () => {
      const today = new Date();

      const result = shouldSendNotification(
        today,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(false);
    });

    it("utilise un délai personnalisé si fourni", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const result = shouldSendNotification(
        threeDaysAgo,
        "1.0.0",
        availableVersions,
        3 // délai personnalisé de 3 jours
      );

      expect(result.shouldRemind).toBe(true);
    });

    it("shouldRemind=false si aucune notification précédente", () => {
      const result = shouldSendNotification(
        undefined,
        undefined,
        availableVersions
      );

      expect(result.shouldRemind).toBe(false);
    });
  });

  describe("Gestion des versions invalides", () => {
    it("retourne toutes les versions si lastNotifiedVersion n'est pas semver", () => {
      const result = shouldSendNotification(
        new Date(),
        "latest",
        availableVersions
      );

      expect(result.newVersions).toEqual(availableVersions);
    });

    it("gère une liste de versions vide", () => {
      const result = shouldSendNotification(
        new Date(),
        "1.0.0",
        []
      );

      expect(result.newVersions).toEqual([]);
      expect(result.shouldRemind).toBe(false);
    });
  });

  describe("Scénarios réels", () => {
    it("notifie uniquement les nouvelles versions après rappel", () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const result = shouldSendNotification(
        eightDaysAgo,
        "1.0.0",
        availableVersions
      );

      expect(result.newVersions.length).toBe(3);
      expect(result.shouldRemind).toBe(true);
    });

    it("combine nouvelles versions + rappel", () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const moreVersions = [
        ...availableVersions,
        parseSemver("2.1.0")!,
        parseSemver("2.2.0")!
      ];

      const result = shouldSendNotification(
        tenDaysAgo,
        "1.1.0",
        moreVersions
      );

      expect(result.newVersions.length).toBe(4); // 1.2.0, 2.0.0, 2.1.0, 2.2.0
      expect(result.shouldRemind).toBe(true);
    });

    it("gère le passage à une version majeure", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const versions = [
        parseSemver("1.9.9")!,
        parseSemver("2.0.0")!
      ];

      const result = shouldSendNotification(
        yesterday,
        "1.9.0",
        versions
      );

      expect(result.newVersions.length).toBe(2);
      expect(result.shouldRemind).toBe(false);
    });
  });

  describe("Cas limites temporels", () => {
    it("gère exactement 7 jours (limite incluse)", () => {
      const exactlySeven = new Date();
      exactlySeven.setDate(exactlySeven.getDate() - 7);
      exactlySeven.setHours(exactlySeven.getHours() - 1); // Pour être sûr d'avoir >= 7 jours

      const result = shouldSendNotification(
        exactlySeven,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(true);
    });

    it("gère les dates futures (ne devrait pas arriver)", () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);

      const result = shouldSendNotification(
        future,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(false);
    });

    it("gère les très anciennes notifications (30+ jours)", () => {
      const longAgo = new Date();
      longAgo.setDate(longAgo.getDate() - 30);

      const result = shouldSendNotification(
        longAgo,
        "1.0.0",
        availableVersions
      );

      expect(result.shouldRemind).toBe(true);
    });
  });
});
