import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { App } from 'supertest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { bootstrapTestApp } from './bootstrap-app';
import { responseData } from './http-helpers';
import { startTestMongo, stopTestMongo } from './setup-mongo';

/**
 * Regression coverage for two things found while extending field-level
 * permissions coverage (2026-08-13):
 *
 * 1. RegistrationRequestsService.submit() never ran
 *    DynamicFieldsValidatorService, so a public, unauthenticated
 *    self-registration submission could contain unknown customFields keys,
 *    wrong-typed values, or write to fields the future Participant isn't
 *    allowed to edit (spec 21, 36-37) — none of it caught until an Admin
 *    later tried to approve() the request. Now validated at submit() time
 *    using the `permissions.participant.edit` matrix, since the data
 *    becomes that Participant's record on approval.
 *
 * 2. Writing this test's "happy path" (submit with an ordinary field the
 *    Admin never explicitly set permissions on) failed with 403
 *    FIELD_EDIT_FORBIDDEN — a real, previously-undiscovered bug: the
 *    nested classes RolePermission/FieldPermissions/DisplaySettings/
 *    SearchSettings in field-definition.schema.ts were never built into
 *    real Mongoose schemas via SchemaFactory.createForClass(), so
 *    `@Prop({ type: FieldPermissions })` silently fell back to `Mixed`
 *    (confirmed via `schema.path('permissions').instance === 'Mixed'`) —
 *    the third instance of the "silent Mixed fallback" bug pattern in this
 *    project (see PROGRESS.md critical bugs #1, #2). None of the nested
 *    defaults (e.g. participant.edit defaulting to true) ever applied;
 *    `permissions` was entirely absent from the stored document unless an
 *    Admin explicitly supplied the full object. Fixed by decorating each
 *    nested class with `@Schema({ _id: false })` and referencing the real
 *    `XxxSchema` (not the bare class) from the parent `@Prop({ type: ... })`.
 */
describe('RegistrationRequest — dynamic field validation on submit (spec 13, 21, 36-37, 84)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<INestApplication<App>['getHttpServer']>;
  let adminToken: string;
  let institutionId: string;
  let editableFieldKey: string;
  let adminOnlyFieldKey: string;

  beforeAll(async () => {
    await startTestMongo();
    app = await bootstrapTestApp();
    server = app.getHttpServer();

    const registerRes = await request(server)
      .post('/institutions/register')
      .send({
        institutionName: 'Self-Registration School',
        adminUsername: 'reg-admin',
        adminPassword: 'testpass123',
      });
    institutionId = responseData<{ institutionId: string }>(
      registerRes,
    ).institutionId;

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: 'reg-admin', password: 'testpass123' });
    adminToken = responseData<{ accessToken: string }>(loginRes).accessToken;

    await request(server)
      .put('/institutions/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ selfRegistrationEnabled: true })
      .expect(200);

    // A freshly-registered institution starts as Pending (spec 6.2) and only
    // a SUPER_ADMIN (platform operator, out of scope for this test) can
    // approve() it to Active — which submit() requires. No such role exists
    // in this test, so flip status directly via the DB, same pattern as
    // institution-settings.integration-spec.ts.
    const connection = app.get<Connection>(getConnectionToken());
    await connection.db
      ?.collection('institutions')
      .updateOne(
        { _id: new Types.ObjectId(institutionId) },
        { $set: { status: 'Active' } },
      );

    // Default permissions.participant.edit is true (spec 21) — an ordinary
    // field the Admin doesn't explicitly configure, exactly the case that
    // exposed the Mixed-fallback bug above.
    const editableRes = await request(server)
      .post('/field-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayName: 'Phone',
        entityType: 'Participant',
        fieldType: 'Text',
      })
      .expect(201);
    editableFieldKey = responseData<{ internalKey: string }>(
      editableRes,
    ).internalKey;

    // Explicitly not editable by a Participant — e.g. an internal note only
    // Admin should ever set.
    const adminOnlyRes = await request(server)
      .post('/field-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayName: 'Internal Note',
        entityType: 'Participant',
        fieldType: 'Text',
        permissions: { participant: { view: true, edit: false } },
      })
      .expect(201);
    adminOnlyFieldKey = responseData<{ internalKey: string }>(
      adminOnlyRes,
    ).internalKey;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestMongo();
  });

  it('persists real permission defaults on a FieldDefinition created without an explicit permissions block (regression for the Mixed-fallback bug)', async () => {
    const connection = app.get<Connection>(getConnectionToken());
    const rawDoc = await connection.db
      ?.collection('field_definitions')
      .findOne<{
        permissions?: {
          staff?: { view: boolean; edit: boolean };
          participant?: { view: boolean; edit: boolean };
        };
      }>({ internalKey: editableFieldKey });
    expect(rawDoc?.permissions?.participant).toEqual({
      view: true,
      edit: true,
    });
    expect(rawDoc?.permissions?.staff).toEqual({ view: true, edit: false });
  });

  it('accepts a submission with a valid, editable custom field', async () => {
    await request(server)
      .post('/registration-requests')
      .send({
        institutionId,
        firstName: 'Yossi',
        lastName: 'Cohen',
        customFields: [{ k: editableFieldKey, v: '050-1234567' }],
      })
      .expect(201);
  });

  it('rejects an unknown custom field key', async () => {
    await request(server)
      .post('/registration-requests')
      .send({
        institutionId,
        firstName: 'Dana',
        lastName: 'Levi',
        customFields: [{ k: 'field_does_not_exist', v: 'x' }],
      })
      .expect(400);
  });

  it('rejects a value of the wrong type for the field', async () => {
    const numberFieldRes = await request(server)
      .post('/field-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        displayName: 'Age',
        entityType: 'Participant',
        fieldType: 'Number',
      })
      .expect(201);
    const ageFieldKey = responseData<{ internalKey: string }>(
      numberFieldRes,
    ).internalKey;

    await request(server)
      .post('/registration-requests')
      .send({
        institutionId,
        firstName: 'Tal',
        lastName: 'Mizrahi',
        customFields: [{ k: ageFieldKey, v: 'not-a-number' }],
      })
      .expect(400);
  });

  it('rejects writing to a field the future Participant cannot edit (spec 21)', async () => {
    await request(server)
      .post('/registration-requests')
      .send({
        institutionId,
        firstName: 'Omer',
        lastName: 'Bar',
        customFields: [{ k: adminOnlyFieldKey, v: 'trying to set this' }],
      })
      .expect(403);
  });
});
