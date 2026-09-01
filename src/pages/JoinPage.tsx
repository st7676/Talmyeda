import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { registrationRequestsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const institutionId = searchParams.get('institution') ?? '';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registrationRequestsApi.submit({ institutionId, firstName, lastName });
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
      <Paper sx={{ p: 4, width: 400 }} elevation={3}>
        {done ? (
          <>
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
              הבקשה נשלחה בהצלחה
            </Typography>
            <Alert severity="success">
              הבקשה שלך נשלחה למוסד וממתינה לאישור. תקבל/י פרטי התחברות לאחר האישור.
            </Alert>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>
              הרשמה למוסד
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              מלא/י את הפרטים כדי לשלוח בקשת הרשמה
            </Typography>
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
