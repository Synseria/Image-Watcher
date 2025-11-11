import { compareSemver, ParsedSemver, parseSemver } from "./semver-utils";

/**
 * Vérifie si une notification doit être envoyée
 * @param lastNotified Date de la dernière notification
 * @param lastNotifiedVersion Dernière version notifiée
 * @param availableVersions Liste des versions disponibles
 * @param reminderDelayDays Délai en jours avant rappel (défaut: 7)
 * @returns Liste des nouvelles versions + indicateur de rappel
 */
export function shouldSendNotification(
  lastNotified: Date | undefined,
  lastNotifiedVersion: string | undefined,
  availableVersions: ParsedSemver[],
  reminderDelayDays = 7
): {
  newVersions: ParsedSemver[];
  shouldRemind: boolean;
} {
  const now = new Date();

  // Calcul du délai depuis la dernière notification
  const shouldRemind = lastNotified
    ? (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60 * 24) >= reminderDelayDays
    : false;

  // Si aucune notification précédente, toutes les versions sont nouvelles
  if (!lastNotified || !lastNotifiedVersion) {
    return {
      newVersions: availableVersions,
      shouldRemind
    };
  }

  // Parsing de la dernière version notifiée
  const lastVersion = parseSemver(lastNotifiedVersion);

  if (!lastVersion) {
    return {
      newVersions: availableVersions,
      shouldRemind
    };
  }

  // Filtrage des versions plus récentes que la dernière notifiée
  const newVersions = availableVersions.filter(tag => compareSemver(tag, lastVersion) > 0);

  return {
    newVersions,
    shouldRemind
  };
}
