import { describe, expect, it } from 'vitest';
import { toISOStringWithTZ } from '../src/utils/date-utils';

describe('toISOStringWithTZ()', () => {
  it('formate une date en ISO 8601 avec timezone UTC', () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toBe('2025-11-06T20:15:30+00:00');
  });

  it('formate une date en ISO 8601 avec timezone Europe/Paris', () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'Europe/Paris');

    // En novembre, Paris est en UTC+1 (heure d'hiver)
    expect(result).toBe('2025-11-06T21:15:30+01:00');
  });

  it('formate une date en ISO 8601 avec timezone America/New_York', () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'America/New_York');

    // En novembre, New York est en UTC-5 (EST)
    expect(result).toBe('2025-11-06T15:15:30-05:00');
  });

  it('gère les fuseaux horaires avec demi-heure (Asia/Kolkata)', () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'Asia/Kolkata');

    // Inde est en UTC+5:30
    expect(result).toBe('2025-11-07T01:45:30+05:30');
  });

  it("gère les fuseaux horaires avec quart d'heure (Asia/Kathmandu)", () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'Asia/Kathmandu');

    // Népal est en UTC+5:45
    expect(result).toBe('2025-11-07T02:00:30+05:45');
  });

  it("utilise UTC par défaut si aucun fuseau n'est spécifié", () => {
    const originalTZ = process.env.TZ;
    delete process.env.TZ;

    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date);

    expect(result).toBe('2025-11-06T20:15:30+00:00');

    // Restaure la variable d'environnement
    if (originalTZ) process.env.TZ = originalTZ;
  });

  it('utilise process.env.TZ si défini', () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = 'Europe/London';

    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date);

    // En novembre, Londres est en UTC+0 (heure d'hiver)
    expect(result).toBe('2025-11-06T20:15:30+00:00');

    // Restaure la variable d'environnement
    if (originalTZ) process.env.TZ = originalTZ;
    else delete process.env.TZ;
  });

  it('formate correctement les zéros à gauche', () => {
    const date = new Date('2025-01-05T03:05:09Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toBe('2025-01-05T03:05:09+00:00');
  });

  it('gère minuit (00:00:00)', () => {
    const date = new Date('2025-11-06T00:00:00Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toBe('2025-11-06T00:00:00+00:00');
  });

  it('gère la fin de journée (23:59:59)', () => {
    const date = new Date('2025-11-06T23:59:59Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toBe('2025-11-06T23:59:59+00:00');
  });

  it('gère le changement de jour avec un fuseau horaire négatif', () => {
    const date = new Date('2025-11-06T02:00:00Z');
    const result = toISOStringWithTZ(date, 'America/Los_Angeles');

    // UTC-8 (PST), donc le jour précédent
    expect(result).toBe('2025-11-05T18:00:00-08:00');
  });

  it('gère le changement de jour avec un fuseau horaire positif', () => {
    const date = new Date('2025-11-06T22:00:00Z');
    const result = toISOStringWithTZ(date, 'Asia/Tokyo');

    // UTC+9 (JST), donc le jour suivant
    expect(result).toBe('2025-11-07T07:00:00+09:00');
  });

  it('gère correctement les années bissextiles', () => {
    const date = new Date('2024-02-29T12:00:00Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toBe('2024-02-29T12:00:00+00:00');
  });

  it('gère les fuseaux horaires extrêmes (UTC+14)', () => {
    const date = new Date('2025-11-06T12:00:00Z');
    const result = toISOStringWithTZ(date, 'Pacific/Kiritimati');

    // Kiritimati est en UTC+14
    expect(result).toBe('2025-11-07T02:00:00+14:00');
  });

  it('gère les fuseaux horaires extrêmes (UTC-12)', () => {
    const date = new Date('2025-11-06T12:00:00Z');
    const result = toISOStringWithTZ(date, 'Etc/GMT+12');

    // GMT+12 signifie UTC-12 (notation inversée)
    expect(result).toBe('2025-11-06T00:00:00-12:00');
  });

  it('préserve la précision à la seconde', () => {
    const date = new Date('2025-11-06T20:15:37Z');
    const result = toISOStringWithTZ(date, 'UTC');

    expect(result).toMatch(/T20:15:37/);
  });

  it('retourne toujours un format cohérent', () => {
    const date = new Date('2025-11-06T20:15:30Z');
    const result = toISOStringWithTZ(date, 'Europe/Paris');

    // Vérifie le format: YYYY-MM-DDTHH:MM:SS±HH:MM
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});
