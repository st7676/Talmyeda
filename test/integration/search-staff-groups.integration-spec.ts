import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Free-text `search` on system fields (spec 72, 85), extended from
 * Participants to Staff (firstName/lastName) and Groups (name) on
 * 2026-08-15 — the last item on PROGRESS.md's "next up" list after the
 * full spec review found it was the only genuinely-missing (not just
 * undocumented) piece. Mirrors ParticipantsService's existing `search`
 * behavior: case-insensitive substring match via a regex $or, shared
 * `escapeRegex` util so user input can't be interpreted as a regex pattern.
 */
describe('Free-text search — Staff & Groups (spec 72, 85)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<INestApplication<App>['getHttpServer']>;
  let adminToken: string;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
    server = app.getHttpServer();

    await request(server).post('/institutions/register').send({
      institutionName: 'Search School',
      adminUsername: 'search-admin',
      adminPassword: 'testpass123',
    });
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'search-admin', password: 'testpass123' });
    adminToken = responseData<{ accessToken: string }>(loginRes).accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  describe('Staff', () => {
    beforeAll(async () => {
      const staff = [
        { firstName: 'Yael', lastName: 'Katz' },
        { firstName: 'Ronen', lastName: 'Peretz' },
        { firstName: 'Michal', lastName: 'Katzenelson' },
      ];
      for (const { firstName, lastName } of staff) {
        await request(server)
          .post('/staff')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ firstName, lastName })
          .expect(201);
      }
    }, 30_000);

    it('matches a substring of firstName, case-insensitively', async () => {
      const res = await request(server)
        .get('/staff?search=yael')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { firstName: string }[] }>(res);
      expect(list.items.map((s) => s.firstName)).toEqual(['Yael']);
    });

    it('matches a substring of lastName across multiple records', async () => {
      const res = await request(server)
        .get('/staff?search=katz')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { lastName: string }[] }>(res);
      expect(list.items.map((s) => s.lastName).sort()).toEqual([
        'Katz',
        'Katzenelson',
      ]);
    });

    it('treats regex-special characters in the search term literally, not as a pattern', async () => {
      const res = await request(server)
        .get(`/staff?search=${encodeURIComponent('.*')}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: unknown[] }>(res);
      expect(list.items).toEqual([]);
    });
  });

  describe('Groups', () => {
    beforeAll(async () => {
      const groups = ['Morning Choir', 'Evening Robotics', 'Choir Advanced'];
      for (const name of groups) {
        await request(server)
          .post('/groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name })
          .expect(201);
      }
    }, 30_000);

    it('matches a substring of name across multiple records', async () => {
      const res = await request(server)
        .get('/groups?search=choir')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { name: string }[] }>(res);
      expect(list.items.map((g) => g.name).sort()).toEqual([
        'Choir Advanced',
        'Morning Choir',
      ]);
    });

    it('returns no matches for an unrelated term', async () => {
      const res = await request(server)
        .get('/groups?search=basketball')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: unknown[]; total: number }>(res);
      expect(list.total).toBe(0);
      expect(list.items).toEqual([]);
    });
  });
});
