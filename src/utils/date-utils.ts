/**
 * Formate une date en ISO 8601 avec fuseau horaire local ou spécifié (ex: 2025-11-06T20:15:00+01:00)
 */
export function toISOStringWithTZ(date: Date, tz = process.env.TZ || 'UTC'): string {
  //Définition de la date en section
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  //Définition d'une map
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  //Conversion en format ISO (local)
  const isoLocal = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;

  //Calcul du décalage horaire par rapport à UTC
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  //Calcul du décalage en minutes (sans le signe négatif !)
  const offset = (tzDate.getTime() - utcDate.getTime()) / 60000;

  //Définition du signe
  const sign = offset >= 0 ? '+' : '-';

  //Définition du pad
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');

  //Définition du décalage
  const offsetStr = `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;

  //Retour du résultat
  return `${isoLocal}${offsetStr}`;
}
