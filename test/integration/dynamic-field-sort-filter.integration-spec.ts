import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Regression coverage for the one piece of complex, previously-untested
 * query logic left after the ObjectId bug fix: dynamic-field sort and
 * filter on Participants (spec sections 38-40). Sorting by a dynamic field
 * requires an aggregation pipeline ($addFields/$let/$filter to pull the
 * value out of the customFields array, then $sort) instead of a plain
 * index-backed sort — see ParticipantsService.findSortedByDynamicField.
 * That pipeline had never been exercised against a real MongoDB engine
 * before this test existed.
 */
describe('Dynamic field sort/filter — aggregation pipeline (spec 38-40)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<INestApplication<App>['getHttpServer']>;
  let adminToken: string;
  let ageFieldKey: string;
  let unsortableFieldKey: string;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
    server = app.getHttpServer();

    await request(server).post('/institutions/register').send({
      institutionName: 'Dynamic Sort School',
      adminUsername: 'sort-admin',
      adminPassword: 'testpass123',
    });
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'sort-admin', password: 'testpass123' });
    adminToken = responseData<{ accessToken: string }>(loginRes).accessToken;

    const ageFieldRes = await request(server)
      .post('/field-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayName: 'Age',
        entityType: 'Participant',
        fieldType: 'Number',
        searchSettings: { sortable: true, filterable: true },
      })
      .expect(201);
    ageFieldKey = responseData<{ internalKey: string }>(
      ageFieldRes,
    ).internalKey;

    const notesFieldRes = await request(server)
      .post('/field-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayName: 'Notes',
        entityType: 'Participant',
        fieldType: 'Text',
        searchSettings: { sortable: false, filterable: false },
      })
      .expect(201);
    unsortableFieldKey = responseData<{ internalKey: string }>(
      notesFieldRes,
    ).internalKey;

    const ages = [
      { firstName: 'Charlie', age: 30 },
      { firstName: 'Alice', age: 10 },
      { firstName: 'Bob', age: 20 },
    ];
    for (const { firstName, age } of ages) {
      await request(server)
        .post('/participants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName,
          lastName: 'Test',
          customFields: [{ k: ageFieldKey, v: age }],
        })
        .expect(201);
    }
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  it('sorts ascending by a dynamic field value pulled out of customFields', async () => {
    const res = await request(server)
      .get(`/participants?sortBy=${ageFieldKey}&sortDir=asc`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = responseData<{ items: { firstName: string }[] }>(res);
    expect(list.items.map((p) => p.firstName)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);
  });

  it('sorts descending by the same dynamic field', async () => {
    const res = await request(server)
      .get(`/participants?sortBy=${ageFieldKey}&sortDir=desc`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = responseData<{ items: { firstName: string }[] }>(res);
    expect(list.items.map((p) => p.firstName)).toEqual([
      'Charlie',
      'Bob',
      'Alice',
    ]);
  });

  it('filters to an exact dynamic field value via $elemMatch', async () => {
    const res = await request(server)
      .get(
        `/participants?filters=${encodeURIComponent(JSON.stringify({ [ageFieldKey]: 20 }))}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = responseData<{
      items: { firstName: string }[];
      total: number;
    }>(res);
    expect(list.total).toBe(1);
    expect(list.items[0].firstName).toBe('Bob');
  });

  it('rejects sorting by a field marked sortable:false (spec 40)', async () => {
    await request(server)
      .get(`/participants?sortBy=${unsortableFieldKey}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('rejects sorting by an unknown field key', async () => {
    await request(server)
      .get('/participants?sortBy=field_does_not_exist')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('rejects filtering by a field marked filterable:false', async () => {
    await request(server)
      .get(
        `/participants?filters=${encodeURIComponent(JSON.stringify({ [unsortableFieldKey]: 'x' }))}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
