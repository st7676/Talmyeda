/** Institution lifecycle status. Spec sections 6.1, 46, 69.1. */
export enum InstitutionStatus {
  Pending = 'Pending',
  Active = 'Active',
  Suspended = 'Suspended',
  Rejected = 'Rejected',
}

/** Generic account status for User records. Spec section 48. */
export enum AccountStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Rejected = 'Rejected',
}
