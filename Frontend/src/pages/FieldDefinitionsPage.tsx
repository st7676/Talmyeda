import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fieldDefinitionsApi, fieldOptionsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { FieldDefinition, FieldOption } from '../types';
import { FieldEntityType, FieldType } from '../types';

const entityTabs = [FieldEntityType.Participant, FieldEntityType.Staff, FieldEntityType.Group];
const entityLabels: Record<FieldEntityType, string> = {
  [FieldEntityType.Participant]: 'משתתפים',
  [FieldEntityType.Staff]: 'צוות',
  [FieldEntityType.Group]: 'קבוצות',
};
const fieldTypeLabels: Record<FieldType, string> = {
  [FieldType.Text]: 'טקסט',
  [FieldType.LongText]: 'טקסט ארוך',
  [FieldType.Number]: 'מספר',
  [FieldType.Boolean]: 'כן/לא',
  [FieldType.Date]: 'תאריך',
  [FieldType.DateTime]: 'תאריך ושעה',
  [FieldType.Select]: 'רשימה נבחרת',
  [FieldType.MultiSelect]: 'רשימה מרובת בחירה',
};

const emptyForm = {
  displayName: '',
  fieldType: FieldType.Text as FieldType,
  required: false,
};

export function FieldDefinitionsPage() {
  const notify = useNotify();
  const [tab, setTab] = useState<FieldEntityType>(FieldEntityType.Participant);
  const [items, setItems] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDefinition | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldDefinition | null>(null);
  const [optionsTarget, setOptionsTarget] = useState<FieldDefinition | null>(null);

  const load = () => {
    setLoading(true);
    fieldDefinitionsApi
      .list({ entityType: tab, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: FieldDefinition) => {
    setEditing(f);
    setForm({ displayName: f.displayName, fieldType: f.fieldType, required: f.required });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fieldDefinitionsApi.update(editing._id, {
          displayName: form.displayName,
          required: form.required,
          confirmRequiredChange: true,
        });
        notify('השדה עודכן בהצלחה', 'success');
      } else {
        await fieldDefinitionsApi.create({
          displayName: form.displayName,
          entityType: tab,
          fieldType: form.fieldType,
          required: form.required,
        });
        notify('השדה נוצר בהצלחה', 'success');
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
      await fieldDefinitionsApi.remove(deleteTarget._id);
      notify('השדה נמחק', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<FieldDefinition>[] = [
    { key: 'displayName', label: 'שם השדה', render: (r) => r.displayName },
    { key: 'internalKey', label: 'מזהה פנימי', render: (r) => r.internalKey },
    {
      key: 'fieldType',
      label: 'סוג',
      render: (r) => <Chip size="small" label={fieldTypeLabels[r.fieldType]} />,
    },
    { key: 'required', label: 'חובה', render: (r) => (r.required ? 'כן' : 'לא') },
  ];

  const isSelectType = form.fieldType === FieldType.Select || form.fieldType === FieldType.MultiSelect;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        שדות מותאמים
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {entityTabs.map((t) => (
          <Tab key={t} value={t} label={entityLabels[t]} />
        ))}
      </Tabs>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r._id}
        total={items.length}
        page={0}
        limit={100}
        loading={loading}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        toolbar={
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            הוספת שדה
          </Button>
        }
        actions={(row) => (
          <Stack direction="row">
            {(row.fieldType === FieldType.Select || row.fieldType === FieldType.MultiSelect) && (
              <IconButton size="small" onClick={() => setOptionsTarget(row)} title="ניהול אפשרויות">
                <ListAltIcon fontSize="small" />
              </IconButton>
            )}
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
        <DialogTitle>{editing ? 'עריכת שדה' : 'שדה חדש'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="שם השדה"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              select
              label="סוג שדה"
              value={form.fieldType}
              onChange={(e) => setForm({ ...form, fieldType: e.target.value as FieldType })}
              disabled={!!editing}
              fullWidth
              helperText={editing ? 'לא ניתן לשנות סוג שדה קיים' : undefined}
            >
              {Object.values(FieldType).map((ft) => (
                <MenuItem key={ft} value={ft}>
                  {fieldTypeLabels[ft]}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                />
              }
              label="שדה חובה"
            />
            {isSelectType && !editing && (
              <Typography variant="body2" color="text.secondary">
                לאחר יצירת השדה ניתן להוסיף אפשרויות בחירה דרך אייקון הרשימה בטבלה.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.displayName}>
            שמירה
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="מחיקת שדה"
        description={deleteTarget ? `למחוק את השדה "${deleteTarget.displayName}"?` : ''}
        confirmLabel="מחיקה"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {optionsTarget && (
        <FieldOptionsDialog field={optionsTarget} onClose={() => setOptionsTarget(null)} />
      )}
    </Box>
  );
}

function FieldOptionsDialog({ field, onClose }: { field: FieldDefinition; onClose: () => void }) {
  const notify = useNotify();
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    fieldOptionsApi
      .listForField(field._id)
      .then(setOptions)
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [field._id]);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await fieldOptionsApi.create({ fieldId: field._id, label: newLabel, value: newLabel });
      setNewLabel('');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fieldOptionsApi.remove(id);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>אפשרויות בחירה — {field.displayName}</DialogTitle>
      <DialogContent>
        <List dense>
          {!loading &&
            options
              .filter((o) => o.isActive)
              .map((o) => (
                <ListItem
                  key={o._id}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRemove(o._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={o.label} />
                </ListItem>
              ))}
        </List>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField
            size="small"
            label="אפשרות חדשה"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
            הוספה
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>סגירה</Button>
      </DialogActions>
    </Dialog>
  );
}
