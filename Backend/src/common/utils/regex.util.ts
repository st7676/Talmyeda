/**
 * Escapes regex-special characters so user-supplied search text can be
 * safely embedded in a `new RegExp(...)` without behaving like a pattern
 * (or throwing on unbalanced special characters). Shared by
 * Participants/Staff/Groups free-text `search` (spec 72, 85).
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
