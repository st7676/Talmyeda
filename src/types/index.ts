// Note: plain `enum` is disallowed by the `erasableSyntaxOnly` TS compiler option,
// so we use the const-object + union-type pattern instead (same call-site syntax:
// Role.Admin, FieldType.Text, etc.)

export const Role = {
  SuperAdmin: 'SUPER_ADMIN',
  Admin: 'ADMIN',
  Staff: 'STAFF',
  Participant: 'PARTICIPANT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
  Rejected: 'Rejected',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const InstitutionStatus = {
  Pending: 'Pending',
  Active: 'Active',
  Suspended: 'Suspended',
  Rejected: 'Rejected',
} as const;
export type InstitutionStatus = (typeof InstitutionStatus)[keyof typeof InstitutionStatus];

export const RegistrationRequestStatus = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type RegistrationRequestStatus =
  (typeof RegistrationRequestStatus)[keyof typeof RegistrationRequestStatus];

export const FieldType = {
  Text: 'Text',
  LongText: 'LongText',
  Number: 'Number',
  Boolean: 'Boolean',
  Date: 'Date',
  DateTime: 'DateTime',
  Select: 'Select',
  MultiSelect: 'MultiSelect',
} as const;
export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const FieldEntityType = {
  Participant: 'Participant',
  Staff: 'Staff',
  Group: 'Group',
} as const;
export type FieldEntityType = (typeof FieldEntityType)[keyof typeof FieldEntityType];

export const ParticipantUserMode = {
  Always: 'always',
  Never: 'never',
  Optional: 'optional',
} as const;
export type ParticipantUserMode = (typeof ParticipantUserMode)[keyof typeof ParticipantUserMode];

export interface CustomFieldValue {
  k: string;
  v: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface JwtPayload {
  sub: string;
  institutionId: string | null;
  role: Role;
}

export interface User {
  _id: string;
  username: string;
  role: Role;
  status: AccountStatus;
  participantId: string | null;
  staffId: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  _id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  customFields: CustomFieldValue[];
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  _id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  customFields: CustomFieldValue[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  institutionId: string;
  name: string;
  customFields: CustomFieldValue[];
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationRequest {
  _id: string;
  institutionId: string;
  status: RegistrationRequestStatus;
  entityType: FieldEntityType;
  requestedData: {
    firstName: string;
    lastName: string;
    customFields: CustomFieldValue[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicFieldOption {
  label: string;
  value: string;
}

/** GET /registration-requests/fields — public, unauthenticated. */
export interface PublicFieldMeta {
  internalKey: string;
  displayName: string;
  fieldType: FieldType;
  required: boolean;
  options?: PublicFieldOption[];
}

export interface RolePermission {
  view?: boolean;
  edit?: boolean;
}

export interface FieldDefinition {
  _id: string;
  institutionId: string;
  entityType: FieldEntityType;
  displayName: string;
  internalKey: string;
  fieldType: FieldType;
  required: boolean;
  permissions: {
    staff?: RolePermission;
    participant?: RolePermission;
  };
  displaySettings: {
    showInList?: boolean;
    order?: number;
  };
  searchSettings: {
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FieldOption {
  _id: string;
  fieldId: string;
  institutionId: string;
  label: string;
  value: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  _id: string;
  name: string;
  status: InstitutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionSettings {
  _id: string;
  institutionId: string;
  participantUserMode: ParticipantUserMode;
  selfRegistrationEnabled: boolean;
  requireApproval: boolean;
  allowMultipleGroups: boolean;
  staffGroupManagementEnabled: boolean;
  updatedAt: string;
}

/** Actual shape of GET /institutions/me — nested, not flat. */
export interface InstitutionMe {
  institution: Institution;
  settings: InstitutionSettings | null;
}

export interface Message {
  _id: string;
  institutionId: string;
  fromUserId: string;
  fromRole: typeof Role.Participant | typeof Role.Staff;
  fromUsername: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}
