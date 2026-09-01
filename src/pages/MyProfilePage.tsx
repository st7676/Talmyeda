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
import Chip from '@mui/material/Chip';
import { usersApi, participantsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { Participant } from '../types';

export function MyProfilePage() {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    usersApi
      .me()
      .then((me) => {
        if (!me.participantId) {
          setNotLinked(true);
          return null;
        }
        return participantsApi.get(me.participantId);
      })
      .then((p) => {
        if (p) {
          setParticipant(p);
          setForm({ firstName: p.firstName, lastName: p.lastName });
        }
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    try {
      const updated = await participantsApi.update(participant._id, form);
      setParticipant(updated);
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
          המשתמש שלך עדיין לא מקושר לרשומת משתתף. פני למנהל/ת המוסד.
        </Alert>
      </Box>
    );
  }

  if (!participant) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          הפרופיל שלי
        </Typography>
        <Alert severity="error">לא הצלחנו לטעון את הפרופיל.</Alert>
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
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.firstName || !form.lastName}
            sx={{ alignSelf: 'flex-start' }}
          >
            שמירה
          </Button>

          {participant.customFields.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">
                שדות נוספים (תצוגה בלבד)
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {participant.customFields.map((f) => (
                  <Chip key={f.k} label={`${f.k}: ${String(f.v)}`} />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                לעריכת שדות אלה — פני למנהל/ת המוסד.
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
