import { useEffect, useState } from 'react';
import { fieldDefinitionsApi } from '../api/endpoints';
import type { FieldDefinition } from '../types';
import { FieldEntityType } from '../types';

export function useFieldDefinitions(entityType: FieldEntityType) {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fieldDefinitionsApi
      .list({ entityType, limit: 100 })
      .then((res) => {
        if (!cancelled) {
          setFields(res.items.sort((a, b) => (a.displaySettings?.order ?? 0) - (b.displaySettings?.order ?? 0)));
        }
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  return { fields, loading };
}
