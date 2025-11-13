import "reflect-metadata";
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../../src/server';

let server: any;

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => {
  if (server) server.close();
});

describe('Health checks', () => {
  it('GET /readyz should return status and 200 or 503', async () => {
    const res = await request(server).get('/readyz');
    expect(['ready', 'not-ready']).toContain(res.body.status);
    expect([200, 503]).toContain(res.status);
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /healthz should return 200 and status ok', async () => {
    const res = await request(server).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
