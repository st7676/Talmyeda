/** Dynamic field data types supported in v1. Spec section 28. */
export enum FieldType {
  Text = 'Text',
  LongText = 'LongText',
  Number = 'Number',
  Boolean = 'Boolean',
  Date = 'Date',
  DateTime = 'DateTime',
  Select = 'Select',
  MultiSelect = 'MultiSelect',
}

/** Entities that support dynamic FieldDefinitions in v1. Spec section 26 note. */
export enum FieldEntityType {
  Participant = 'Participant',
  Staff = 'Staff',
  Group = 'Group',
}
