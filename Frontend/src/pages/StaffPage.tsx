import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CustomFieldsEditor } from '../components/CustomFieldsEditor';
import { useFieldDefinitions } from '../hooks/useFieldDefinitions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { staffApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { CustomFieldValue, Staff } from '../types';
import { FieldEntityType } from '../types';

const emptyForm = { firstName: '', lastName: '', customFields: [] as CustomFieldValue[] };

export function StaffPage() {
  const notify = useNotify();
  const { fields } = useFieldDefinitions(FieldEntityType.Staff);

  const [items, setItems] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  const load = () => {
    setLoading(true);
    staffApi
      .list({ page: page + 1, limit, search: debouncedSearch || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, limit, debouncedSearch]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditingId(s._id);
    setForm({ firstName: s.firstName, lastName: s.lastName, customFields: s.customFields });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await staffApi.update(editingId, form);
        notify('איש הצוות עודכן בהצלחה', 'success');
      } else {
        await staffApi.create(form);
        notify('איש הצוות נוצר בהצלחה', 'success');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await staffApi.remove(deleteTarget._id);
      notify('איש הצוות נמחק', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<Staff>[] = [
    { key: 'firstName', label: 'שם פרטי', render: (r) => r.firstName },
    { key: 'lastName', label: 'שם משפחה', render: (r) => r.lastName },
    {
      key: 'createdAt',
      label: 'נוצר בתאריך',
      render: (r) => new Date(r.createdAt).toLocaleDateString('he-IL'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        צוות
      </Typography>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r._id}
        total={total}
        page={page}
        limit={limit}
        loading={loading}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(0);
        }}
        toolbar={
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            הוספת איש צוות
          </Button>
        }
        actions={(row) => (
          <Stack direction="row">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'עריכת איש צוות' : 'איש צוות חדש'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="שם פרטי"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="שם משפחה"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
              fullWidth
            />
            {fields.length > 0 && (
              <CustomFieldsEditor
                fieldDefinitions={fields}
                value={form.customFields}
                onChange={(cf) => setForm({ ...form, customFields: cf })}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ביטול</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.firstName || !form.lastName}
          >
            שמירה
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="מחיקת איש צוות"
        description={deleteTarget ? `למחוק את ${deleteTarget.firstName} ${deleteTarget.lastName}?` : ''}
        confirmLabel="מחיקה"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
