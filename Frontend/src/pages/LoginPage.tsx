import { useState, type FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { mustChangePassword } = await login(username, password);
      navigate(mustChangePassword ? '/change-password' : '/', { replace: true });
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
      }}
    >
      <Paper sx={{ p: 4, width: 360 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
          כניסה למערכת תלמידה
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="שם משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          <TextField
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'התחברות'}
          </Button>

          <Divider sx={{ my: 1 }} />

          {/*
            Two deliberately separate paths — a real complaint fixed here:
            this used to be a single "no institution yet? register" link
            that a student/staff member with no login could click, landing
            them on the *institution* signup form (creating a whole new
            organization) instead of anywhere relevant to them. There is no
            generic "join as student/staff" link possible from this page —
            joining an existing institution requires that institution's own
            shared /join link (see Settings), which isn't discoverable from
            here by design (no public institution directory).
          */}
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            פותחים מוסד חדש במערכת?{' '}
            <Link component={RouterLink} to="/register">
              רישום מוסד
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            תלמיד/ה או איש/אשת צוות? יש לבקש מהמוסד שלכם את קישור ההרשמה האישי.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
