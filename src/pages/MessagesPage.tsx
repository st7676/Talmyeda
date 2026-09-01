import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { messagesApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import type { Message } from '../types';
import { Role } from '../types';

const roleLabel: Partial<Record<string, string>> = {
  [Role.Participant]: 'תלמיד/ה',
  [Role.Staff]: 'צוות',
};

export function MessagesPage() {
  const { claims } = useAuth();
  return claims?.role === Role.Admin ? <AdminInbox /> : <ContactAdmin />;
}

/** PARTICIPANT/STAFF view: send a message + see your own history. */
function ContactAdmin() {
  const notify = useNotify();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    messagesApi
      .mine({ page: 1, limit: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await messagesApi.send(body.trim());
      setBody('');
      notify('ההודעה נשלחה למנהל/ת המוסד', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        פנייה למנהל/ת המוסד
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="הודעה"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sending || !body.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            שליחה
          </Button>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        ההודעות ששלחתי
      </Typography>
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <CircularProgress size={24} />
        ) : items.length === 0 ? (
          <Typography color="text.secondary">עדיין לא שלחת הודעות.</Typography>
        ) : (
          <List dense>
            {items.map((m, i) => (
              <Box key={m._id}>
                {i > 0 && <Divider component="li" />}
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={m.body}
                    secondary={new Date(m.createdAt).toLocaleString('he-IL')}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

/** ADMIN view: inbox of everyone's messages. */
function AdminInbox() {
  const notify = useNotify();
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    messagesApi
      .list({ page: 1, limit: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkRead = async (id: string) => {
    try {
      await messagesApi.markRead(id);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        הודעות מתלמידים ומצוות
      </Typography>
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <CircularProgress size={24} />
        ) : items.length === 0 ? (
          <Typography color="text.secondary">אין הודעות.</Typography>
        ) : (
          <List dense>
            {items.map((m, i) => (
              <Box key={m._id}>
                {i > 0 && <Divider component="li" />}
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    !m.isRead && (
                      <IconButton size="small" onClick={() => handleMarkRead(m._id)} title="סמן כנקרא">
                        <MarkEmailReadIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography component="span" sx={{ fontWeight: m.isRead ? 400 : 700 }}>
                          {m.fromUsername}
                        </Typography>
                        <Chip size="small" variant="outlined" label={roleLabel[m.fromRole] ?? m.fromRole} />
                        {!m.isRead && <Chip size="small" color="primary" label="חדש" />}
                      </Stack>
                    }
                    secondary={
                      <>
                        {m.body}
                        <br />
                        <Typography component="span" variant="caption" color="text.secondary">
                          {new Date(m.createdAt).toLocaleString('he-IL')}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
