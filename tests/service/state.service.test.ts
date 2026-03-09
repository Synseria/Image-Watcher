import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import * as fs from 'fs';
import { StateService } from '../../src/service/state/state.service';

describe('StateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  describe('constructor / chargement initial', () => {
    it('démarre avec un état vide si le fichier nexiste pas', () => {
      const service = new StateService();

      expect(service.get('default/app')).toBeUndefined();
    });

    it('charge létat depuis le fichier si présent', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          'default/app': { version: 'v1.2.0', notifiedAt: '2024-01-01T00:00:00.000Z' }
        })
      );

      const service = new StateService();
      const state = service.get('default/app');

      expect(state?.version).toBe('v1.2.0');
      expect(state?.notifiedAt).toBeInstanceOf(Date);
      expect(state?.notifiedAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('démarre avec un état vide si le fichier est corrompu', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json {{{');

      const service = new StateService();

      expect(service.get('default/app')).toBeUndefined();
    });

    it('démarre avec un état vide si la lecture lève une erreur', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('EPERM'); });

      const service = new StateService();

      expect(service.get('default/app')).toBeUndefined();
    });
  });

  describe('get()', () => {
    it('retourne undefined pour une clé inconnue', () => {
      const service = new StateService();

      expect(service.get('unknown/app')).toBeUndefined();
    });

    it('désérialise correctement la date ISO', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          'ns/app': { version: 'v2.0.0', notifiedAt: '2025-06-15T10:30:00.000Z' }
        })
      );

      const service = new StateService();
      const state = service.get('ns/app');

      expect(state?.notifiedAt).toBeInstanceOf(Date);
      expect(state?.notifiedAt.getFullYear()).toBe(2025);
    });
  });

  describe('set()', () => {
    it("persiste l'état sur disque après un set", () => {
      const service = new StateService();
      const notifiedAt = new Date('2024-06-01T12:00:00.000Z');

      service.set('default/app', { version: 'v2.0.0', notifiedAt });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"v2.0.0"'),
        'utf-8'
      );
    });

    it('retourne létat correct après set', () => {
      const service = new StateService();
      const notifiedAt = new Date('2024-06-01T12:00:00.000Z');

      service.set('ns/app', { version: 'v3.0.0', notifiedAt });
      const result = service.get('ns/app');

      expect(result?.version).toBe('v3.0.0');
      expect(result?.notifiedAt.toISOString()).toBe(notifiedAt.toISOString());
    });

    it('écrase une valeur existante', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'ns/app': { version: 'v1.0.0', notifiedAt: '2024-01-01T00:00:00.000Z' } })
      );

      const service = new StateService();
      service.set('ns/app', { version: 'v2.0.0', notifiedAt: new Date() });

      expect(service.get('ns/app')?.version).toBe('v2.0.0');
    });

    it('crée le répertoire parent si nécessaire', () => {
      const service = new StateService();

      service.set('ns/app', { version: 'v1.0.0', notifiedAt: new Date() });

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('résiste aux erreurs decriture sans crash', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('disk full'); });
      const service = new StateService();

      expect(() => service.set('ns/app', { version: 'v1.0.0', notifiedAt: new Date() })).not.toThrow();
    });

    it('garde létat en mémoire même si lécriture échoue', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('disk full'); });
      const service = new StateService();

      service.set('ns/app', { version: 'v1.0.0', notifiedAt: new Date() });

      expect(service.get('ns/app')?.version).toBe('v1.0.0');
    });
  });

  describe('IMAGE_WATCHER_STATE_FILE', () => {
    it('utilise le chemin configuré via env', () => {
      vi.stubEnv('IMAGE_WATCHER_STATE_FILE', '/custom/path/state.json');

      const service = new StateService();
      service.set('ns/app', { version: 'v1.0.0', notifiedAt: new Date() });

      expect(fs.writeFileSync).toHaveBeenCalledWith('/custom/path/state.json', expect.any(String), 'utf-8');
    });

    it('utilise data/state.json par défaut', () => {
      const service = new StateService();
      service.set('ns/app', { version: 'v1.0.0', notifiedAt: new Date() });

      expect(fs.writeFileSync).toHaveBeenCalledWith('data/state.json', expect.any(String), 'utf-8');
    });
  });
});
