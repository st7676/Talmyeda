import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Extends the dynamic-field sort/filter coverage (spec 38-40) from
 * Participants to Staff and Groups, now that both go through the shared
 * `DynamicQueryService` (extracted from ParticipantsService on 2026-08-13).
 * Exercises the same aggregation pipeline / manual-ObjectId-cast path
 * (critical bug #2, PROGRESS.md 2026-08-13) against real MongoDB for these
 * two entities, since a shared helper can still be wired up wrong per
 * caller (wrong model, wrong entityType, wrong system-sort-field set).
 */
describe('Dynamic field sort/filter — Staff & Groups (spec 38-40)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<INestApplication<App>['getHttpServer']>;
  let adminToken: string;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
    server = app.getHttpServer();

    await request(server).post('/institutions/register').send({
      institutionName: 'Dynamic Sort School (Staff/Groups)',
      adminUsername: 'sort-admin-2',
      adminPassword: 'testpass123',
    });
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'sort-admin-2', password: 'testpass123' });
    adminToken = responseData<{ accessToken: string }>(loginRes).accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  describe('Staff', () => {
    let yearsFieldKey: string;
    let unsortableFieldKey: string;

    beforeAll(async () => {
      const yearsFieldRes = await request(server)
        .post('/field-definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Years of Experience',
          entityType: 'Staff',
          fieldType: 'Number',
          searchSettings: { sortable: true, filterable: true },
        })
        .expect(201);
      yearsFieldKey = responseData<{ internalKey: string }>(
        yearsFieldRes,
      ).internalKey;

      const notesFieldRes = await request(server)
        .post('/field-definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Staff Notes',
          entityType: 'Staff',
          fieldType: 'Text',
          searchSettings: { sortable: false, filterable: false },
        })
        .expect(201);
      unsortableFieldKey = responseData<{ internalKey: string }>(
        notesFieldRes,
      ).internalKey;

      const staff = [
        { firstName: 'Dana', years: 12 },
        { firstName: 'Amit', years: 2 },
        { firstName: 'Noa', years: 7 },
      ];
      for (const { firstName, years } of staff) {
        await request(server)
          .post('/staff')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName,
            lastName: 'Teacher',
            customFields: [{ k: yearsFieldKey, v: years }],
          })
          .expect(201);
      }
    }, 30_000);

    it('sorts ascending by a dynamic field value', async () => {
      const res = await request(server)
        .get(`/staff?sortBy=${yearsFieldKey}&sortDir=asc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { firstName: string }[] }>(res);
      expect(list.items.map((s) => s.firstName)).toEqual([
        'Amit',
        'Noa',
        'Dana',
      ]);
    });

    it('sorts descending by the same dynamic field', async () => {
      const res = await request(server)
        .get(`/staff?sortBy=${yearsFieldKey}&sortDir=desc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { firstName: string }[] }>(res);
      expect(list.items.map((s) => s.firstName)).toEqual([
        'Dana',
        'Noa',
        'Amit',
      ]);
    });

    it('filters to an exact dynamic field value', async () => {
      const res = await request(server)
        .get(
          `/staff?filters=${encodeURIComponent(JSON.stringify({ [yearsFieldKey]: 7 }))}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{
        items: { firstName: string }[];
        total: number;
      }>(res);
      expect(list.total).toBe(1);
      expect(list.items[0].firstName).toBe('Noa');
    });

    it('rejects sorting by a field marked sortable:false', async () => {
      await request(server)
        .get(`/staff?sortBy=${unsortableFieldKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('rejects sorting by a system field not in the Staff allow-list (unknown key)', async () => {
      await request(server)
        .get('/staff?sortBy=field_does_not_exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Groups', () => {
    let capacityFieldKey: string;

    beforeAll(async () => {
      const capacityFieldRes = await request(server)
        .post('/field-definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Capacity',
          entityType: 'Group',
          fieldType: 'Number',
          searchSettings: { sortable: true, filterable: true },
        })
        .expect(201);
      capacityFieldKey = responseData<{ internalKey: string }>(
        capacityFieldRes,
      ).internalKey;

      const groups = [
        { name: 'Choir', capacity: 40 },
        { name: 'Robotics', capacity: 15 },
        { name: 'Chess Club', capacity: 25 },
      ];
      for (const { name, capacity } of groups) {
        await request(server)
          .post('/groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name, customFields: [{ k: capacityFieldKey, v: capacity }] })
          .expect(201);
      }
    }, 30_000);

    it('sorts ascending by a dynamic field value', async () => {
      const res = await request(server)
        .get(`/groups?sortBy=${capacityFieldKey}&sortDir=asc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { name: string }[] }>(res);
      expect(list.items.map((g) => g.name)).toEqual([
        'Robotics',
        'Chess Club',
        'Choir',
      ]);
    });

    it('filters to an exact dynamic field value', async () => {
      const res = await request(server)
        .get(
          `/groups?filters=${encodeURIComponent(JSON.stringify({ [capacityFieldKey]: 25 }))}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{
        items: { name: string }[];
        total: number;
      }>(res);
      expect(list.total).toBe(1);
      expect(list.items[0].name).toBe('Chess Club');
    });

    it('sorts by the system field "name" without touching the aggregation pipeline', async () => {
      const res = await request(server)
        .get('/groups?sortBy=name&sortDir=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = responseData<{ items: { name: string }[] }>(res);
      expect(list.items.map((g) => g.name)).toEqual([
        'Chess Club',
        'Choir',
        'Robotics',
      ]);
    });
  });
});
