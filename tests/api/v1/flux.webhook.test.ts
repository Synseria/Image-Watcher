import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { mockFindApplication, mockNotifyVersionTransition } = vi.hoisted(() => ({
  mockFindApplication: vi.fn(),
  mockNotifyVersionTransition: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/service/image-watcher/image-watcher.service', () => ({
  ImageWatcherService: class {
    findApplication = mockFindApplication;
    processApplication = vi.fn().mockResolvedValue(undefined);
    notifyVersionTransition = mockNotifyVersionTransition;
    upgradeApplication = vi.fn().mockResolvedValue(true);
  }
}));

import { startServer } from '../../../src/server';

const mockApp = {
  name: 'victoria-metrics',
  namespace: 'flux-system',
  type: 'Deployment' as const,
  imageInformation: { repository: 'victoriametrics/victoria-metrics', tag: 'v1.135.0' },
  annotations: {}
};

const validPayload = {
  involvedObject: {
    kind: 'ImageUpdateAutomation',
    name: 'victoria-metrics',
    namespace: 'flux-system'
  },
  severity: 'info',
  timestamp: '2026-03-09T17:00:00Z',
  message: 'victoria-metrics: 1.135.0 -> 1.136.0',
  reason: 'Commit'
};

let server: any;

beforeAll(async () => {
  mockFindApplication.mockResolvedValue(mockApp);
  server = await startServer();
});

afterAll(() => {
  if (server) server.close();
});

describe('POST /api/v1/webhooks/flux', () => {
  it('retourne 202 pour un payload valide', async () => {
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send(validPayload);
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
  });

  it('retourne 400 sans involvedObject.name', async () => {
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send({ involvedObject: { namespace: 'flux-system' }, message: 'test' });
    expect(res.status).toBe(400);
  });

  it('retourne 400 sans involvedObject.namespace', async () => {
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send({ involvedObject: { name: 'app' }, message: 'test' });
    expect(res.status).toBe(400);
  });

  it('retourne 400 sans message', async () => {
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send({ involvedObject: { name: 'app', namespace: 'ns' } });
    expect(res.status).toBe(400);
  });

  it('retourne 400 pour un body vide', async () => {
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send({});
    expect(res.status).toBe(400);
  });

  it('retourne 401 si FLUX_WEBHOOK_TOKEN est défini et token absent', async () => {
    vi.stubEnv('FLUX_WEBHOOK_TOKEN', 'secret-token');
    const res = await request(server)
      .post('/api/v1/webhooks/flux')
      .send(validPayload);
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it('retourne 401 si FLUX_WEBHOOK_TOKEN est défini et token invalide', async () => {
    vi.stubEnv('FLUX_WEBHOOK_TOKEN', 'secret-token');
    const res = await request(server)
      .post('/api/v1/webhooks/flux?token=wrong-token')
      .send(validPayload);
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it('retourne 202 avec le bon token', async () => {
    vi.stubEnv('FLUX_WEBHOOK_TOKEN', 'secret-token');
    const res = await request(server)
      .post('/api/v1/webhooks/flux?token=secret-token')
      .send(validPayload);
    expect(res.status).toBe(202);
    vi.unstubAllEnvs();
  });
});
