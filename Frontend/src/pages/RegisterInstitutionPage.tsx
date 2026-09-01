import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { institutionsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';

export function RegisterInstitutionPage() {
  const [institutionName, setInstitutionName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (adminPassword.length < 8) {
      setError('הסיסמה חייבת לכלול לפחות 8 תווים');
      return;
    }
    if (adminPassword !== confirm) {
      setError('אימות הסיסמה אינו תואם');
      return;
    }
    setLoading(true);
    try {
      await institutionsApi.register(institutionName, adminUsername, adminPassword);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
            <Alert severity="info" sx={{ mb: 3 }}>
              רישום המוסד ממתין לאישור מנהל המערכת. לאחר האישור תוכלו להתחבר עם שם המשתמש
              והסיסמה שהגדרתם.
            </Alert>
            <Button component={RouterLink} to="/login" variant="contained" fullWidth>
              חזרה למסך ההתחברות
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>
              רישום מוסד חדש
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              פתיחת מוסד חדש במערכת תלמידה
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="שם המוסד"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                autoFocus
                required
              />
              <TextField
                label="שם משתמש למנהל"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
              />
              <TextField
                label="סיסמה"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                helperText="לפחות 8 תווים"
              />
              <TextField
                label="אימות סיסמה"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'רישום מוסד'}
              </Button>
              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                כבר רשומים?{' '}
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
