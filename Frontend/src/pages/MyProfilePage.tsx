import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { usersApi, participantsApi, staffApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { PublicCustomFieldsEditor } from '../components/PublicCustomFieldsEditor';
import type { CustomFieldValue, PublicFieldMeta } from '../types';
import { Role } from '../types';

export function MyProfilePage() {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [role, setRole] = useState<typeof Role.Participant | typeof Role.Staff | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [fields, setFields] = useState<PublicFieldMeta[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
  const [customFields, setCustomFields] = useState<CustomFieldValue[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    usersApi
      .me()
      .then(async (me) => {
        const linkedId = me.role === Role.Staff ? me.staffId : me.participantId;
        if (!linkedId) {
          setNotLinked(true);
          return;
        }
        setRole(me.role === Role.Staff ? Role.Staff : Role.Participant);
        setEntityId(linkedId);

        const [entity, myFields] = await Promise.all([
          me.role === Role.Staff ? staffApi.get(linkedId) : participantsApi.get(linkedId),
          usersApi.getMyFields(),
        ]);
        setForm({ firstName: entity.firstName, lastName: entity.lastName });
        setCustomFields(entity.customFields);
        setFields(myFields);
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!entityId || !role) return;
    setSaving(true);
    try {
      const body = { ...form, customFields };
      const updated =
        role === Role.Staff
          ? await staffApi.update(entityId, body)
          : await participantsApi.update(entityId, body);
      setForm({ firstName: updated.firstName, lastName: updated.lastName });
      setCustomFields(updated.customFields);
      notify('הפרופיל עודכן בהצלחה', 'success');
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  if (notLinked) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          הפרופיל שלי
        </Typography>
        <Alert severity="info">
          המשתמש שלך עדיין לא מקושר לרשומה במערכת. פני/ה למנהל/ת המוסד.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        הפרופיל שלי
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="שם פרטי"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            fullWidth
          />
          <TextField
            label="שם משפחה"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            fullWidth
          />

          {fields.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">
                שדות נוספים
              </Typography>
              <PublicCustomFieldsEditor
                fields={fields}
                value={customFields}
                onChange={setCustomFields}
              />
            </>
          )}

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.firstName || !form.lastName}
            sx={{ alignSelf: 'flex-start' }}
          >
            שמירה
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
