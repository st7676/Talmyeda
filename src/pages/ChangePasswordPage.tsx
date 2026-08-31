import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { usersApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { setMustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('הסיסמה החדשה חייבת לכלול לפחות 8 תווים');
      return;
    }
    if (newPassword !== confirm) {
      setError('אימות הסיסמה אינו תואם');
      return;
    }
    setLoading(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setMustChangePassword(false);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, width: 380 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>
          יש להחליף סיסמה
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          זהו כניסה ראשונה למערכת — יש להגדיר סיסמה חדשה
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="סיסמה נוכחית"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <TextField
            label="סיסמה חדשה"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="לפחות 8 תווים"
          />
          <TextField
            label="אימות סיסמה חדשה"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            עדכון סיסמה
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
