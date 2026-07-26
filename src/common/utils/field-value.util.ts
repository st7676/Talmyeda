import { FieldType } from '../enums';

/**
 * Checks whether a raw customFields value (v) is compatible with a
 * FieldType. Used both for blocking destructive field type changes
 * (spec section 32) and — later — for create/update validation (spec 36).
 *
 * activeOptionValues is required for Select/MultiSelect: only currently
 * active FieldOption.value entries are considered valid (spec 33, 34).
 */
export function isValueCompatibleWithType(
  fieldType: FieldType,
  value: unknown,
  activeOptionValues?: Set<string>,
): boolean {
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.LongText:
      return typeof value === 'string';
    case FieldType.Number:
      return typeof value === 'number' && Number.isFinite(value);
    case FieldType.Boolean:
      return typeof value === 'boolean';
    case FieldType.Date:
    case FieldType.DateTime:
      return (
        value instanceof Date ||
        (typeof value === 'string' &&
          value.length > 0 &&
          !Number.isNaN(Date.parse(value)))
      );
    case FieldType.Select:
      return (
        typeof value === 'string' &&
        (!activeOptionValues || activeOptionValues.has(value))
      );
    case FieldType.MultiSelect:
      return (
        Array.isArray(value) &&
        value.every(
          (item) =>
            typeof item === 'string' &&
            (!activeOptionValues || activeOptionValues.has(item)),
        )
      );
    default:
      return false;
  }
}
