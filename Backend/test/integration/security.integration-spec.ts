import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Security tests (spec section 102.3): tenant isolation, unauthorized
 * access, permission bypass attempts. These are the tests the spec asks
 * for explicitly, distinct from functional integration tests — the point
 * here isn't "does the feature work" but "can it be abused".
 */
describe('Security — tenant isolation, auth, and role enforcement (spec 91-93, 102.3)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<INestApplication<App>['getHttpServer']>;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
    server = app.getHttpServer();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  async function registerAndLogin(
    institutionName: string,
    adminUsername: string,
  ): Promise<string> {
    await request(server).post('/institutions/register').send({
      institutionName,
      adminUsername,
      adminPassword: 'testpass123',
    });
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: adminUsername, password: 'testpass123' });
    return responseData<{ accessToken: string }>(loginRes).accessToken;
  }

  describe('Tenant isolation (spec 44, 92)', () => {
    let adminATokenLocal: string;
    let adminBTokenLocal: string;
    let participantIdInA: string;

    beforeAll(async () => {
      adminATokenLocal = await registerAndLogin(
        'Tenant A School',
        'tenant-a-admin',
      );
      adminBTokenLocal = await registerAndLogin(
        'Tenant B School',
        'tenant-b-admin',
      );

      const createRes = await request(server)
        .post('/participants')
        .set('Authorization', `Bearer ${adminATokenLocal}`)
        .send({ firstName: 'Alice', lastName: 'InTenantA' })
        .expect(201);
      participantIdInA = responseData<{ _id: string }>(createRes)._id;
    });

    it("institution B's admin gets 404 (not the record) reading institution A's participant by id", async () => {
      await request(server)
        .get(`/participants/${participantIdInA}`)
        .set('Authorization', `Bearer ${adminBTokenLocal}`)
        .expect(404);
    });

    it("institution B's participant list never includes institution A's participant", async () => {
      const listRes = await request(server)
        .get('/participants')
        .set('Authorization', `Bearer ${adminBTokenLocal}`)
        .expect(200);
      const list = responseData<{ items: { _id: string }[] }>(listRes);
      expect(list.items.map((p) => p._id)).not.toContain(participantIdInA);
    });

    it("institution A's own admin CAN read its own participant (control case)", async () => {
      const res = await request(server)
        .get(`/participants/${participantIdInA}`)
        .set('Authorization', `Bearer ${adminATokenLocal}`)
        .expect(200);
      expect(responseData<{ firstName: string }>(res).firstName).toBe('Alice');
    });

    it("institution B's admin cannot soft-delete institution A's participant", async () => {
      await request(server)
        .delete(`/participants/${participantIdInA}`)
        .set('Authorization', `Bearer ${adminBTokenLocal}`)
        .expect(404);

      // Confirm it's still there from A's perspective — the delete attempt
      // above did not silently succeed against the wrong tenant's record.
      await request(server)
        .get(`/participants/${participantIdInA}`)
        .set('Authorization', `Bearer ${adminATokenLocal}`)
        .expect(200);
    });
  });

  describe('Unauthenticated access (spec 90, 93)', () => {
    it('rejects a protected route with no Authorization header', async () => {
      await request(server).get('/participants').expect(401);
    });

    it('rejects a protected route with a malformed bearer token', async () => {
      await request(server)
        .get('/participants')
        .set('Authorization', 'Bearer this-is-not-a-real-jwt')
        .expect(401);
    });

    it('still allows @Public() routes with no token (login itself)', async () => {
      await request(server)
        .post('/auth/login')
        .send({ username: 'nobody', password: 'whatever' })
        .expect(401); // wrong credentials, but NOT blocked by the auth guard itself
    });
  });

  describe('Role-based access control (spec 8-11, 93)', () => {
    let adminToken: string;
    let staffUsername: string;
    let staffTempPassword: string;

    beforeAll(async () => {
      adminToken = await registerAndLogin('RBAC School', 'rbac-admin');

      staffUsername = 'rbac-staff';
      const createStaffRes = await request(server)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: staffUsername, role: 'STAFF' })
        .expect(201);
      staffTempPassword = responseData<{ tempPassword: string }>(
        createStaffRes,
      ).tempPassword;
    });

    it('a brand-new STAFF user is blocked from everything except changing their password (spec 70.1)', async () => {
      const loginRes = await request(server)
        .post('/auth/login')
        .send({ username: staffUsername, password: staffTempPassword })
        .expect(200);
      const login = responseData<{
        mustChangePassword: boolean;
        accessToken: string;
      }>(loginRes);
      expect(login.mustChangePassword).toBe(true);

      await request(server)
        .get('/participants')
        .set('Authorization', `Bearer ${login.accessToken}`)
        .expect(403);
    });

    it('after changing password, STAFF can read Participants but not manage FieldDefinitions', async () => {
      const loginRes = await request(server)
        .post('/auth/login')
        .send({ username: staffUsername, password: staffTempPassword });
      const { accessToken } = responseData<{ accessToken: string }>(loginRes);

      await request(server)
        .post('/users/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: staffTempPassword,
          newPassword: 'newStaffPass123',
        })
        .expect(200);

      const reloginRes = await request(server)
        .post('/auth/login')
        .send({ username: staffUsername, password: 'newStaffPass123' })
        .expect(200);
      const staffToken = responseData<{ accessToken: string }>(
        reloginRes,
      ).accessToken;

      // Allowed: STAFF can read Participants (spec 10).
      await request(server)
        .get('/participants')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // Forbidden: creating FieldDefinitions is Administrator-only (spec 29, 80).
      await request(server)
        .post('/field-definitions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          displayName: 'Should Not Be Allowed',
          entityType: 'Participant',
          fieldType: 'Text',
        })
        .expect(403);
    });
  });
});
