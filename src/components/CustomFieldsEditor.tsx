import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { fieldOptionsApi } from '../api/endpoints';
import type { CustomFieldValue, FieldDefinition, FieldOption } from '../types';
import { FieldType } from '../types';

interface Props {
  fieldDefinitions: FieldDefinition[];
  value: CustomFieldValue[];
  onChange: (value: CustomFieldValue[]) => void;
}

export function CustomFieldsEditor({ fieldDefinitions, value, onChange }: Props) {
  const [optionsByField, setOptionsByField] = useState<Record<string, FieldOption[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const selectFields = fieldDefinitions.filter(
      (f) => f.fieldType === FieldType.Select || f.fieldType === FieldType.MultiSelect,
    );
    if (selectFields.length === 0) {
      setLoadingOptions(false);
      return;
    }
    setLoadingOptions(true);
    Promise.all(selectFields.map((f) => fieldOptionsApi.listForField(f._id)))
      .then((results) => {
        const map: Record<string, FieldOption[]> = {};
        selectFields.forEach((f, i) => {
          map[f._id] = results[i].filter((o) => o.isActive);
        });
        setOptionsByField(map);
      })
      .finally(() => setLoadingOptions(false));
  }, [fieldDefinitions]);

  const getValue = (internalKey: string) => value.find((v) => v.k === internalKey)?.v;

  const setValue = (internalKey: string, v: unknown) => {
    const next = value.filter((item) => item.k !== internalKey);
    next.push({ k: internalKey, v });
    onChange(next);
  };

  if (loadingOptions) return <CircularProgress size={20} />;

  return (
    <Grid container spacing={2}>
      {fieldDefinitions.map((field) => {
        const current = getValue(field.internalKey);
        const commonProps = {
          fullWidth: true,
          label: field.displayName + (field.required ? ' *' : ''),
        };

        switch (field.fieldType) {
          case FieldType.Text:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                />
              </Grid>
            );
          case FieldType.LongText:
            return (
              <Grid size={{ xs: 12 }} key={field._id}>
                <TextField
                  {...commonProps}
                  multiline
                  minRows={3}
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                />
              </Grid>
            );
          case FieldType.Number:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  type="number"
                  value={(current as number) ?? ''}
                  onChange={(e) =>
                    setValue(field.internalKey, e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </Grid>
            );
          case FieldType.Boolean:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!current}
                      onChange={(e) => setValue(field.internalKey, e.target.checked)}
                    />
                  }
                  label={commonProps.label}
                />
              </Grid>
            );
          case FieldType.Date:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                />
              </Grid>
            );
          case FieldType.DateTime:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  type="datetime-local"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                />
              </Grid>
            );
          case FieldType.Select:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  select
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                >
                  <MenuItem value="">—</MenuItem>
                  {(optionsByField[field._id] ?? []).map((opt) => (
                    <MenuItem key={opt._id} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            );
          case FieldType.MultiSelect: {
            const arr = Array.isArray(current) ? (current as string[]) : [];
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field._id}>
                <TextField
                  {...commonProps}
                  select
                  slotProps={{ select: { multiple: true } }}
                  value={arr}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValue(field.internalKey, typeof v === 'string' ? v.split(',') : v);
                  }}
                >
                  {(optionsByField[field._id] ?? []).map((opt) => (
                    <MenuItem key={opt._id} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            );
          }
          default:
            return null;
        }
      })}
    </Grid>
  );
}
