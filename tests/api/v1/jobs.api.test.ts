import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { mockListeApplications, mockProcessApplication } = vi.hoisted(() => ({
  mockListeApplications: vi.fn(),
  mockProcessApplication: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/service/orchestrator/orchestrator.service', () => ({
  OrchestratorService: class {
    listeApplications = mockListeApplications;
  }
}));

vi.mock('../../../src/service/image-watcher/image-watcher.service', () => ({
  ImageWatcherService: class {
    findApplication = vi.fn();
    processApplication = mockProcessApplication;
    upgradeApplication = vi.fn().mockResolvedValue(true);
  }
}));

import { startServer } from '../../../src/server';

const mockApp = {
  name: 'victoria-metrics',
  namespace: 'monitoring',
  type: 'Deployment' as const,
  imageInformation: { repository: 'victoriametrics/victoria-metrics', tag: 'v1.135.0' },
  annotations: {}
};

let server: any;

beforeAll(async () => {
  mockListeApplications.mockResolvedValue([mockApp]);
  server = await startServer();
});

afterAll(() => {
  if (server) server.close();
});

describe('POST /api/v1/jobs/trigger', () => {
  it('retourne 202 quand une application correspond', async () => {
    mockListeApplications.mockResolvedValue([mockApp]);
    const res = await request(server)
      .post('/api/v1/jobs/trigger')
      .send({ image: 'victoriametrics/victoria-metrics', oldVersion: '1.135.0', newVersion: '1.136.0' });
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
    expect(res.body.application.name).toBe('victoria-metrics');
    expect(res.body.application.namespace).toBe('monitoring');
  });

  it('retourne 202 sans oldVersion ni newVersion', async () => {
    mockListeApplications.mockResolvedValue([mockApp]);
    const res = await request(server)
      .post('/api/v1/jobs/trigger')
      .send({ image: 'victoriametrics/victoria-metrics' });
    expect(res.status).toBe(202);
  });

  it('retourne 404 quand aucune application ne correspond', async () => {
    mockListeApplications.mockResolvedValue([mockApp]);
    const res = await request(server)
      .post('/api/v1/jobs/trigger')
      .send({ image: 'totally/unknown-image' });
    expect(res.status).toBe(404);
  });

  it('retourne 400 si le paramètre image est manquant', async () => {
    const res = await request(server)
      .post('/api/v1/jobs/trigger')
      .send({ oldVersion: '1.135.0' });
    expect(res.status).toBe(400);
  });

  it('retourne 400 si le body est vide', async () => {
    const res = await request(server)
      .post('/api/v1/jobs/trigger')
      .send({});
    expect(res.status).toBe(400);
  });
});
