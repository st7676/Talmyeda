import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { usersApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { User } from '../types';
import { AccountStatus, Role } from '../types';

const statusColor: Record<AccountStatus, 'success' | 'default' | 'error'> = {
  [AccountStatus.Active]: 'success',
  [AccountStatus.Inactive]: 'default',
  [AccountStatus.Rejected]: 'error',
};

const statusLabel: Record<AccountStatus, string> = {
  [AccountStatus.Active]: 'פעיל',
  [AccountStatus.Inactive]: 'לא פעיל',
  [AccountStatus.Rejected]: 'נדחה',
};

const emptyForm = { username: '', role: Role.Staff as typeof Role.Staff | typeof Role.Participant };

export function UsersPage() {
  const notify = useNotify();
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; tempPassword: string } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    usersApi
      .list({ page: page + 1, limit })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, limit]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await usersApi.create(form);
      notify('המשתמש נוצר בהצלחה', 'success');
      setDialogOpen(false);
      setCreatedCreds({ username: res.username, tempPassword: res.tempPassword });
      setForm(emptyForm);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    const nextStatus =
      user.status === AccountStatus.Active ? AccountStatus.Inactive : AccountStatus.Active;
    try {
      await usersApi.update(user._id, { status: nextStatus });
      notify('הסטטוס עודכן', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await usersApi.remove(deleteTarget._id);
      notify('המשתמש נמחק', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<User>[] = [
    { key: 'username', label: 'שם משתמש', render: (r) => r.username },
    { key: 'role', label: 'תפקיד', render: (r) => r.role },
    {
      key: 'status',
      label: 'סטטוס',
      render: (r) => (
        <Chip
          size="small"
          label={statusLabel[r.status]}
          color={statusColor[r.status]}
          onClick={() => toggleStatus(r)}
        />
      ),
    },
    { key: 'mustChangePassword', label: 'ממתין לשינוי סיסמה', render: (r) => (r.mustChangePassword ? 'כן' : 'לא') },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        משתמשים
      </Typography>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r._id}
        total={total}
        page={page}
        limit={limit}
        loading={loading}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(0);
        }}
        toolbar={
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
            הוספת משתמש
          </Button>
        }
        actions={(row) => (
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>משתמש חדש</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="שם משתמש"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              fullWidth
            />
            <TextField
              select
              label="תפקיד"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as typeof Role.Staff | typeof Role.Participant })}
              fullWidth
            >
              <MenuItem value={Role.Staff}>צוות</MenuItem>
              <MenuItem value={Role.Participant}>משתתף</MenuItem>
            </TextField>
            <Typography variant="body2" color="text.secondary">
              תיווצר סיסמה זמנית אוטומטית עבור המשתמש.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.username}>
            יצירה
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!createdCreds} onClose={() => setCreatedCreds(null)} maxWidth="xs" fullWidth>
        <DialogTitle>המשתמש נוצר בהצלחה</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            יש למסור למשתמש את הפרטים הבאים. הסיסמה הזמנית תוצג פעם אחת בלבד.
          </Alert>
          <Typography>
            <strong>שם משתמש:</strong> {createdCreds?.username}
          </Typography>
          <Typography>
            <strong>סיסמה זמנית:</strong> {createdCreds?.tempPassword}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatedCreds(null)}>סגירה</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="מחיקת משתמש"
        description={deleteTarget ? `למחוק את המשתמש "${deleteTarget.username}"?` : ''}
        confirmLabel="מחיקה"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
