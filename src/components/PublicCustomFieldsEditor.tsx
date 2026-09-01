import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import type { CustomFieldValue, PublicFieldMeta } from '../types';
import { FieldType } from '../types';

/**
 * Same rendering logic as CustomFieldsEditor, but for the public join form:
 * takes field metadata that already has Select/MultiSelect options inlined
 * (from GET /registration-requests/fields), so — unlike CustomFieldsEditor —
 * it makes no further API calls and works for an unauthenticated caller.
 */
interface Props {
  fields: PublicFieldMeta[];
  value: CustomFieldValue[];
  onChange: (value: CustomFieldValue[]) => void;
}

export function PublicCustomFieldsEditor({ fields, value, onChange }: Props) {
  const getValue = (internalKey: string) => value.find((v) => v.k === internalKey)?.v;

  const setValue = (internalKey: string, v: unknown) => {
    const next = value.filter((item) => item.k !== internalKey);
    next.push({ k: internalKey, v });
    onChange(next);
  };

  return (
    <Grid container spacing={2}>
      {fields.map((field) => {
        const current = getValue(field.internalKey);
        const commonProps = {
          fullWidth: true,
          label: field.displayName + (field.required ? ' *' : ''),
        };

        switch (field.fieldType) {
          case FieldType.Text:
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
                <TextField
                  {...commonProps}
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                />
              </Grid>
            );
          case FieldType.LongText:
            return (
              <Grid size={{ xs: 12 }} key={field.internalKey}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
                <TextField
                  {...commonProps}
                  select
                  value={(current as string) ?? ''}
                  onChange={(e) => setValue(field.internalKey, e.target.value)}
                >
                  <MenuItem value="">—</MenuItem>
                  {(field.options ?? []).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            );
          case FieldType.MultiSelect: {
            const arr = Array.isArray(current) ? (current as string[]) : [];
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={field.internalKey}>
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
                  {(field.options ?? []).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
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
