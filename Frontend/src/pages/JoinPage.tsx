import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import { registrationRequestsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { PublicCustomFieldsEditor } from '../components/PublicCustomFieldsEditor';
import type { CustomFieldValue, PublicFieldMeta } from '../types';
import { FieldEntityType } from '../types';

type SelfRegRole = typeof FieldEntityType.Participant | typeof FieldEntityType.Staff;

const roleLabels: Record<SelfRegRole, string> = {
  [FieldEntityType.Participant]: 'תלמיד/ה',
  [FieldEntityType.Staff]: 'איש/אשת צוות',
};

/** ?role=participant|staff — each institution shares a separate link per audience (see Settings). */
function roleFromParam(raw: string | null): SelfRegRole {
  return raw === 'staff' ? FieldEntityType.Staff : FieldEntityType.Participant;
}

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const institutionId = searchParams.get('institution') ?? '';
  const entityType = roleFromParam(searchParams.get('role'));

  const [fields, setFields] = useState<PublicFieldMeta[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldValue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    setFieldsLoading(true);
    setFieldsError(null);
    registrationRequestsApi
      .getPublicFields(institutionId, entityType)
      .then(setFields)
      .catch((err) => setFieldsError(getErrorMessage(err)))
      .finally(() => setFieldsLoading(false));
  }, [institutionId, entityType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registrationRequestsApi.submit({
        institutionId,
        entityType,
        firstName,
        lastName,
        customFields,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!institutionId) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, width: 400 }} elevation={3}>
          <Alert severity="error">
            הקישור שברשותך אינו תקין — חסר מזהה מוסד. יש לבקש קישור הרשמה מעודכן מהמוסד.
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 460 }} elevation={3}>
        {done ? (
          <>
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
              הבקשה נשלחה בהצלחה
            </Typography>
            <Alert severity="success">
              הבקשה שלך נשלחה למוסד וממתינה לאישור.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              המערכת לא שולחת התראה אוטומטית — לאחר האישור המוסד ייצור עבורך שם משתמש וסיסמה
              זמנית וימסור לך אותם ישירות (למשל בטלפון, במייל או פנים אל פנים). אם לא שמעת/ה
              כלום תוך כמה ימים, כדאי לפנות למוסד ולברר.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>
              הרשמה למוסד
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Chip label={`נרשמים בתור: ${roleLabels[entityType]}`} color="primary" />
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="שם פרטי"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                required
              />
              <TextField
                label="שם משפחה"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              {fieldsLoading ? (
                <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
              ) : fieldsError ? (
                <Alert severity="error">{fieldsError}</Alert>
              ) : fields.length > 0 ? (
                <PublicCustomFieldsEditor
                  fields={fields}
                  value={customFields}
                  onChange={setCustomFields}
                />
              ) : null}

              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'שליחת בקשה'}
              </Button>
              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                כבר יש לך חשבון?{' '}
                <Link component={RouterLink} to="/login">
                  התחברות
                </Link>
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
