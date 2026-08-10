import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { App } from 'supertest/types';
// `import * as request` loses callability for this CJS module under
// "module": "nodenext"; require-equals is the safe form (see app.e2e-spec.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Regression test for the critical ObjectId/Mixed schema bug documented in
 * PROGRESS.md (found 2026-08-10 via manual Docker testing). Before the fix,
 * `type: Types.ObjectId` in @Prop() decorators resolved to Mongoose's
 * `Mixed` type instead of `ObjectId`, so institutionId written as a real
 * ObjectId (in register()) could never be matched by a query using the
 * JWT-derived string (in getMe()/getSettings()) — GET /institutions/me
 * returned settings: null despite the document existing.
 *
 * This test would have failed before the fix and must keep passing.
 */
describe('Institution settings — ObjectId cast regression (spec 46-47, 69)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  it('GET /institutions/me returns non-null settings right after registration', async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post('/institutions/register')
      .send({
        institutionName: 'Regression Test School',
        adminUsername: 'regression-admin',
        adminPassword: 'testpass123',
      })
      .expect(201);
    const registered = responseData<{ institutionId: string }>(registerRes);
    expect(registered.institutionId).toEqual(expect.any(String));

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'regression-admin', password: 'testpass123' })
      .expect(200);
    const { accessToken } = responseData<{ accessToken: string }>(loginRes);
    expect(accessToken).toEqual(expect.any(String));

    const meRes = await request(server)
      .get('/institutions/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const me = responseData<{ settings: unknown }>(meRes);

    // This is the exact assertion that failed before the fix.
    expect(me.settings).not.toBeNull();
    expect(me.settings).toMatchObject({
      participantUserMode: 'optional',
      selfRegistrationEnabled: false,
      requireApproval: true,
      allowMultipleGroups: true,
      staffGroupManagementEnabled: false,
    });
  });

  it('PUT /institutions/settings updates and persists (previously 404 before the fix)', async () => {
    const server = app.getHttpServer();

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'regression-admin', password: 'testpass123' })
      .expect(200);
    const { accessToken } = responseData<{ accessToken: string }>(loginRes);

    const updateRes = await request(server)
      .put('/institutions/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selfRegistrationEnabled: true })
      .expect(200);
    const updated = responseData<{ selfRegistrationEnabled: boolean }>(
      updateRes,
    );
    expect(updated.selfRegistrationEnabled).toBe(true);
  });

  it('institutionId is stored as a real BSON ObjectId, not a string', async () => {
    // @nestjs/mongoose calls mongoose.createConnection() internally, which
    // is a *separate* Connection object from the global `mongoose.connection`
    // singleton — grabbing the connection this way (instead of `import
    // mongoose from 'mongoose'; mongoose.connection`) is what actually
    // reflects what the running app is using.
    const connection = app.get<Connection>(getConnectionToken());
    const doc = await connection.db
      ?.collection('institution_settings')
      .findOne<{ institutionId: unknown }>({});
    expect(doc).toBeTruthy();
    expect(doc?.institutionId).toBeInstanceOf(Types.ObjectId);
  });
});
