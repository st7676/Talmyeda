import { api } from './client';
import type {
  Paginated,
  User,
  Participant,
  Staff,
  Group,
  RegistrationRequest,
  FieldDefinition,
  FieldOption,
  Institution,
  InstitutionMe,
  InstitutionSettings,
  CustomFieldValue,
  FieldEntityType,
  AccountStatus,
  RegistrationRequestStatus,
  ParticipantUserMode,
  InstitutionStatus,
  PublicFieldMeta,
} from '../types';

// ---------- Auth ----------
export const authApi = {
  login: (username: string, password: string) =>
    api
      .post<{ success: true; data: { accessToken: string; mustChangePassword: boolean } }>(
        '/auth/login',
        { username, password },
      )
      .then((r) => r.data.data),
};

// ---------- Institutions ----------
export const institutionsApi = {
  register: (institutionName: string, adminUsername: string, adminPassword: string) =>
    api
      .post('/institutions/register', { institutionName, adminUsername, adminPassword })
      .then((r) => r.data.data),
  /** GET /institutions/me returns { institution, settings } — nested, not a flat Institution. */
  me: () => api.get<{ data: InstitutionMe }>('/institutions/me').then((r) => r.data.data),
  updateSettings: (body: {
    participantUserMode?: ParticipantUserMode;
    selfRegistrationEnabled?: boolean;
    requireApproval?: boolean;
    allowMultipleGroups?: boolean;
    staffGroupManagementEnabled?: boolean;
  }) =>
    api
      .put<{ data: InstitutionSettings }>('/institutions/settings', body)
      .then((r) => r.data.data),
};

// ---------- Platform (SUPER_ADMIN only) ----------
export const platformApi = {
  listInstitutions: (params: { status?: InstitutionStatus; page?: number; limit?: number }) =>
    api
      .get<{ data: Paginated<Institution> }>('/platform/institutions', { params })
      .then((r) => r.data.data),
  approve: (id: string) =>
    api.post(`/platform/institutions/${id}/approve`).then((r) => r.data.data),
  suspend: (id: string) =>
    api.post(`/platform/institutions/${id}/suspend`).then((r) => r.data.data),
  reactivate: (id: string) =>
    api.post(`/platform/institutions/${id}/reactivate`).then((r) => r.data.data),
  reject: (id: string) =>
    api.post(`/platform/institutions/${id}/reject`).then((r) => r.data.data),
};

// ---------- Users ----------
export interface ListParams {
  page?: number;
  limit?: number;
}

export const usersApi = {
  me: () => api.get<{ data: User }>('/users/me').then((r) => r.data.data),
  list: (params: ListParams) =>
    api.get<{ data: Paginated<User> }>('/users', { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),
  create: (body: {
    username: string;
    role: 'STAFF' | 'PARTICIPANT';
    password?: string;
    participantId?: string;
    staffId?: string;
  }) => api.post('/users', body).then((r) => r.data.data),
  update: (
    id: string,
    body: { status?: AccountStatus; password?: string; participantId?: string; staffId?: string },
  ) => api.put(`/users/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/users/${id}`).then((r) => r.data.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }).then((r) => r.data.data),
};

// ---------- Participants ----------
export interface EntityQueryParams extends ListParams {
  search?: string;
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  groupId?: string;
}

export const participantsApi = {
  list: (params: EntityQueryParams) =>
    api
      .get<{ data: Paginated<Participant> }>('/participants', { params })
      .then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: Participant }>(`/participants/${id}`).then((r) => r.data.data),
  create: (body: { firstName: string; lastName: string; customFields?: CustomFieldValue[] }) =>
    api.post('/participants', body).then((r) => r.data.data),
  update: (
    id: string,
    body: Partial<{ firstName: string; lastName: string; customFields: CustomFieldValue[] }>,
  ) => api.put(`/participants/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/participants/${id}`).then((r) => r.data.data),
};

// ---------- Staff ----------
export const staffApi = {
  list: (params: EntityQueryParams) =>
    api.get<{ data: Paginated<Staff> }>('/staff', { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: Staff }>(`/staff/${id}`).then((r) => r.data.data),
  create: (body: { firstName: string; lastName: string; customFields?: CustomFieldValue[] }) =>
    api.post('/staff', body).then((r) => r.data.data),
  update: (
    id: string,
    body: Partial<{ firstName: string; lastName: string; customFields: CustomFieldValue[] }>,
  ) => api.put(`/staff/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/staff/${id}`).then((r) => r.data.data),
};

// ---------- Groups ----------
export const groupsApi = {
  list: (params: EntityQueryParams) =>
    api.get<{ data: Paginated<Group> }>('/groups', { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: Group }>(`/groups/${id}`).then((r) => r.data.data),
  create: (body: { name: string; customFields?: CustomFieldValue[] }) =>
    api.post('/groups', body).then((r) => r.data.data),
  update: (id: string, body: Partial<{ name: string; customFields: CustomFieldValue[] }>) =>
    api.put(`/groups/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/groups/${id}`).then((r) => r.data.data),
};

// ---------- Participant-Groups ----------
export const participantGroupsApi = {
  assign: (participantId: string, groupId: string, startDate?: string) =>
    api.post('/participant-groups', { participantId, groupId, startDate }).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/participant-groups/${id}`).then((r) => r.data.data),
};

// ---------- Staff-Groups ----------
export const staffGroupsApi = {
  assign: (staffId: string, groupId: string, roleDescription?: string) =>
    api.post('/staff-groups', { staffId, groupId, roleDescription }).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/staff-groups/${id}`).then((r) => r.data.data),
};

// ---------- Registration Requests ----------
export const registrationRequestsApi = {
  submit: (body: {
    institutionId: string;
    entityType?: FieldEntityType;
    firstName: string;
    lastName: string;
    customFields?: CustomFieldValue[];
  }) => api.post('/registration-requests', body).then((r) => r.data.data),
  /** GET /registration-requests/fields — public, unauthenticated. */
  getPublicFields: (institutionId: string, entityType: FieldEntityType) =>
    api
      .get<{ data: PublicFieldMeta[] }>('/registration-requests/fields', {
        params: { institutionId, entityType },
      })
      .then((r) => r.data.data),
  list: (params: ListParams & { status?: RegistrationRequestStatus }) =>
    api
      .get<{ data: Paginated<RegistrationRequest> }>('/registration-requests', { params })
      .then((r) => r.data.data),
  approve: (id: string, createUser?: boolean) =>
    api
      .post<{
        data: {
          requestId: string;
          entityType: FieldEntityType;
          participantId?: string;
          staffId?: string;
          username?: string;
          tempPassword?: string;
        };
      }>(`/registration-requests/${id}/approve`, { createUser })
      .then((r) => r.data.data),
  reject: (id: string) =>
    api.post(`/registration-requests/${id}/reject`).then((r) => r.data.data),
};

// ---------- Field Definitions ----------
export const fieldDefinitionsApi = {
  list: (params: { entityType?: FieldEntityType } & ListParams = {}) =>
    api
      .get<{ data: Paginated<FieldDefinition> }>('/field-definitions', { params })
      .then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: FieldDefinition }>(`/field-definitions/${id}`).then((r) => r.data.data),
  create: (body: Record<string, unknown>) =>
    api.post('/field-definitions', body).then((r) => r.data.data),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/field-definitions/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/field-definitions/${id}`).then((r) => r.data.data),
};

// ---------- Field Options ----------
export const fieldOptionsApi = {
  listForField: (fieldId: string) =>
    api
      .get<{ data: FieldOption[] }>('/field-options', { params: { fieldId } })
      .then((r) => r.data.data),
  create: (body: { fieldId: string; label: string; value: string; order?: number }) =>
    api.post('/field-options', body).then((r) => r.data.data),
  update: (id: string, body: Partial<{ label: string; value: string; order: number }>) =>
    api.put(`/field-options/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/field-options/${id}`).then((r) => r.data.data),
};
