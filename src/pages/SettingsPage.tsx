import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { institutionsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { ParticipantUserMode } from '../types';

interface SettingsForm {
  participantUserMode: ParticipantUserMode;
  selfRegistrationEnabled: boolean;
  requireApproval: boolean;
  allowMultipleGroups: boolean;
  staffGroupManagementEnabled: boolean;
}

const defaults: SettingsForm = {
  participantUserMode: ParticipantUserMode.Optional,
  selfRegistrationEnabled: true,
  requireApproval: true,
  allowMultipleGroups: true,
  staffGroupManagementEnabled: false,
};

export function SettingsPage() {
  const notify = useNotify();
  const [institutionName, setInstitutionName] = useState('');
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    institutionsApi
      .me()
      .then((inst) => setInstitutionName(inst.name))
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await institutionsApi.updateSettings(form);
      notify('ההגדרות נשמרו בהצלחה', 'success');
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        הגדרות מוסד
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <TextField label="שם המוסד" value={institutionName} disabled fullWidth />

          <TextField
            select
            label="מצב יצירת משתמשים למשתתפים"
            value={form.participantUserMode}
            onChange={(e) =>
              setForm({ ...form, participantUserMode: e.target.value as ParticipantUserMode })
            }
            fullWidth
          >
            <MenuItem value={ParticipantUserMode.Always}>תמיד</MenuItem>
            <MenuItem value={ParticipantUserMode.Never}>אף פעם</MenuItem>
            <MenuItem value={ParticipantUserMode.Optional}>לפי בחירה</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={form.selfRegistrationEnabled}
                onChange={(e) => setForm({ ...form, selfRegistrationEnabled: e.target.checked })}
              />
            }
            label="אפשר הרשמה עצמית"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.requireApproval}
                onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
              />
            }
            label="דרוש אישור מנהל לבקשות הרשמה"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.allowMultipleGroups}
                onChange={(e) => setForm({ ...form, allowMultipleGroups: e.target.checked })}
              />
            }
            label="אפשר שיוך למספר קבוצות"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.staffGroupManagementEnabled}
                onChange={(e) =>
                  setForm({ ...form, staffGroupManagementEnabled: e.target.checked })
                }
              />
            }
            label="אפשר לצוות לנהל שיוכי קבוצות"
          />

          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
            שמירת הגדרות
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
