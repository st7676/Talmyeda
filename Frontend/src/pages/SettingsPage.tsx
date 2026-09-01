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
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { institutionsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { ParticipantUserMode } from '../types';
import { getPublicAppUrl } from '../utils/publicAppUrl';

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
  const [institutionId, setInstitutionId] = useState('');
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    institutionsApi
      .me()
      .then(({ institution, settings }) => {
        setInstitutionName(institution.name);
        setInstitutionId(institution._id);
        // Bug fixed here: GET /institutions/me returns { institution, settings }
        // (nested), not a flat Institution object. This page was silently
        // ignoring the real `settings` and always showing/saving hardcoded
        // defaults instead of the institution's actual configured values.
        if (settings) {
          setForm({
            participantUserMode: settings.participantUserMode,
            selfRegistrationEnabled: settings.selfRegistrationEnabled,
            requireApproval: settings.requireApproval,
            allowMultipleGroups: settings.allowMultipleGroups,
            staffGroupManagementEnabled: settings.staffGroupManagementEnabled,
          });
        }
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const publicAppUrl = getPublicAppUrl();
  const participantJoinLink = publicAppUrl
    ? `${publicAppUrl}/join?institution=${institutionId}&role=participant`
    : null;
  const staffJoinLink = publicAppUrl
    ? `${publicAppUrl}/join?institution=${institutionId}&role=staff`
    : null;

  const copyLink = (link: string | null) => {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    notify('הקישור הועתק', 'success');
  };

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
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          קישורי הרשמה עצמית
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          שני קישורים נפרדים — אחד לתלמידים ואחד לצוות — כל אחד פותח טופס עם השדות המתאימים
          לאותו קהל (בכפוף להגדרת "אפשר הרשמה עצמית" למטה). כל בקשה תמתין לאישורך במסך "בקשות
          הרשמה".
        </Typography>

        {participantJoinLink && staffJoinLink ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                לתלמידים
              </Typography>
              <TextField
                value={participantJoinLink}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => copyLink(participantJoinLink)}
                          size="small"
                          title="העתקת קישור"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                לצוות
              </Typography>
              <TextField
                value={staffJoinLink}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => copyLink(staffJoinLink)}
                          size="small"
                          title="העתקת קישור"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Stack>
        ) : (
          <Alert severity="warning">
            אי אפשר להציג קישורים שיתופיים מתוך אפליקציית הדסקטופ (הם לא נגישים דרך דפדפן
            חיצוני). כדי לקבל קישורים אמיתיים, יש להגדיר את משתנה הסביבה{' '}
            <code>VITE_PUBLIC_APP_URL</code> בעת בניית האפליקציה לכתובת שבה הפרונטנד מתארח
            כאתר רגיל (לא רק כתוכנת דסקטופ).
          </Alert>
        )}
      </Paper>
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
