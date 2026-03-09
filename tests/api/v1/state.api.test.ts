import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { mockGetAll } = vi.hoisted(() => ({
  mockGetAll: vi.fn().mockReturnValue({
    'flux-system/victoria-metrics': { version: '1.136.0', notifiedAt: '2026-03-09T17:00:00.000Z' }
  })
}));

vi.mock('../../../src/service/state/state.service', () => ({
  StateService: class {
    get = vi.fn().mockReturnValue(undefined);
    set = vi.fn();
    getAll = mockGetAll;
  }
}));

vi.mock('../../../src/service/image-watcher/image-watcher.service', () => ({
  ImageWatcherService: class {
    findApplication = vi.fn();
    processApplication = vi.fn().mockResolvedValue(undefined);
    upgradeApplication = vi.fn().mockResolvedValue(true);
  }
}));

import { startServer } from '../../../src/server';

let server: any;

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => {
  if (server) server.close();
});

describe('GET /api/v1/state', () => {
  it('retourne 200 avec le state sérialisé', async () => {
    const res = await request(server).get('/api/v1/state');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('flux-system/victoria-metrics');
    expect(res.body['flux-system/victoria-metrics'].version).toBe('1.136.0');
  });

  it('retourne un objet JSON vide si aucun état', async () => {
    mockGetAll.mockReturnValueOnce({});
    const res = await request(server).get('/api/v1/state');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});
