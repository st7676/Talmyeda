import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Full-chain regression test: Group + Participant + ParticipantGroup +
 * cross-collection groupId filtering. This is the same flow manually
 * verified via curl/mongosh in Docker after the ObjectId schema fix
 * (PROGRESS.md, 2026-08-10) — automated here so future regressions in any
 * of the ObjectId-referencing fields (participantId/groupId, not just
 * institutionId) are caught without manual testing.
 */
describe('Participants + Groups — cross-collection ObjectId matching (spec 71-78)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();

    const server = app.getHttpServer();
    await request(server).post('/institutions/register').send({
      institutionName: 'Chain Test School',
      adminUsername: 'chain-admin',
      adminPassword: 'testpass123',
    });
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'chain-admin', password: 'testpass123' });
    ({ accessToken } = responseData<{ accessToken: string }>(loginRes));
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  it('creates a Group, a Participant, assigns them, and finds the participant via ?groupId=', async () => {
    const server = app.getHttpServer();

    const groupRes = await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Class A' })
      .expect(201);
    const { _id: groupId } = responseData<{ _id: string }>(groupRes);

    const participantRes = await request(server)
      .post('/participants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Sara', lastName: 'Levi' })
      .expect(201);
    const { _id: participantId } = responseData<{ _id: string }>(
      participantRes,
    );

    await request(server)
      .post('/participant-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ participantId, groupId })
      .expect(201);

    const listRes = await request(server)
      .get(`/participants?groupId=${groupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const list = responseData<{
      total: number;
      items: { _id: string; firstName: string; lastName: string }[];
    }>(listRes);

    expect(list.total).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      _id: participantId,
      firstName: 'Sara',
      lastName: 'Levi',
    });
  });

  it('a participant NOT in the group does not show up in the groupId-filtered list', async () => {
    const server = app.getHttpServer();

    const groupRes = await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Class B' })
      .expect(201);
    const { _id: groupId } = responseData<{ _id: string }>(groupRes);

    // Participant exists in the institution but is never assigned to Class B.
    await request(server)
      .post('/participants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Unassigned', lastName: 'Person' })
      .expect(201);

    const listRes = await request(server)
      .get(`/participants?groupId=${groupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const list = responseData<{ total: number }>(listRes);

    expect(list.total).toBe(0);
  });
});
