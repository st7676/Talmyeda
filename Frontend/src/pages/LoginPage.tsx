import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
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
            "רישום מוסד חדש" removed from here entirely — this login page is
            shared by every audience (students, staff, and institution
            admins alike), and the vast majority of visitors are students/
            staff who should never see an "open a new institution" link.
            Institution admins reach /register through a different channel
            (still a live route, just not linked from here). Joining an
            existing institution as student/staff still isn't linkable from
            this generic page by design — it requires that institution's own
            shared /join link (see Settings), since there's no public
            institution directory to pick from.
          */}
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            תלמיד/ה או איש/אשת צוות? יש לבקש מהמוסד שלכם את קישור ההרשמה האישי.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
