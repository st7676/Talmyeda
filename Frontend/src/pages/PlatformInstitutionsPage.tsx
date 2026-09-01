import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import ReplayIcon from '@mui/icons-material/Replay';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { platformApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { getPublicAppUrl } from '../utils/publicAppUrl';
import type { Institution } from '../types';
import { InstitutionStatus } from '../types';

const statusColor: Record<InstitutionStatus, 'warning' | 'success' | 'default' | 'error'> = {
  [InstitutionStatus.Pending]: 'warning',
  [InstitutionStatus.Active]: 'success',
  [InstitutionStatus.Suspended]: 'default',
  [InstitutionStatus.Rejected]: 'error',
};

const statusLabel: Record<InstitutionStatus, string> = {
  [InstitutionStatus.Pending]: 'ממתין לאישור',
  [InstitutionStatus.Active]: 'פעיל',
  [InstitutionStatus.Suspended]: 'מושעה',
  [InstitutionStatus.Rejected]: 'נדחה',
};

type ConfirmAction = { type: 'approve' | 'suspend' | 'reactivate' | 'reject'; institution: Institution };

export function PlatformInstitutionsPage() {
  const notify = useNotify();
  const [items, setItems] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<InstitutionStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const publicAppUrl = getPublicAppUrl();
  const registrationLink = publicAppUrl ? `${publicAppUrl}/register` : null;

  const copyRegistrationLink = () => {
    if (!registrationLink) return;
    void navigator.clipboard.writeText(registrationLink);
    notify('הקישור הועתק', 'success');
  };

  const load = () => {
    setLoading(true);
    platformApi
      .listInstitutions({ page: page + 1, limit, status: status || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, limit, status]);

  const actionLabels: Record<ConfirmAction['type'], { title: string; confirm: string; danger?: boolean }> = {
    approve: { title: 'אישור מוסד', confirm: 'אישור' },
    suspend: { title: 'השעיית מוסד', confirm: 'השעיה', danger: true },
    reactivate: { title: 'הפעלת מוסד מחדש', confirm: 'הפעלה מחדש' },
    reject: { title: 'דחיית מוסד', confirm: 'דחייה', danger: true },
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      const fn = {
        approve: platformApi.approve,
        suspend: platformApi.suspend,
        reactivate: platformApi.reactivate,
        reject: platformApi.reject,
      }[confirmAction.type];
      await fn(confirmAction.institution._id);
      notify('הפעולה בוצעה בהצלחה', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<Institution>[] = [
    { key: 'name', label: 'שם המוסד', render: (r) => r.name },
    {
      key: 'status',
      label: 'סטטוס',
      render: (r) => <Chip size="small" label={statusLabel[r.status]} color={statusColor[r.status]} />,
    },
    {
      key: 'createdAt',
      label: 'תאריך רישום',
      render: (r) => new Date(r.createdAt).toLocaleDateString('he-IL'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        ניהול מוסדות (מנהל-על)
      </Typography>

      {/*
        Real request handled here: institution signup is no longer
        discoverable from the shared /login page (any visitor, mostly
        students/staff, used to see it there — removed in an earlier
        change). Now the only way a new institution finds /register is if
        the SUPER_ADMIN proactively sends them this link — same
        copy-a-shareable-link pattern already used for the student/staff
        join links in Settings.
      */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          קישור לרישום מוסד חדש
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          הקישור הזה כבר לא מופיע במסך ההתחברות — יש לשלוח אותו ישירות למוסד שרוצה להצטרף
          למערכת. המוסד יירשם במצב "ממתין לאישור" ויופיע ברשימה למטה.
        </Typography>
        {registrationLink ? (
          <TextField
            value={registrationLink}
            fullWidth
            size="small"
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={copyRegistrationLink} size="small" title="העתקת קישור">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        ) : (
          <Alert severity="warning">
            אי אפשר להציג קישור שיתופי מתוך אפליקציית הדסקטופ (הוא לא נגיש דרך דפדפן חיצוני).
            כדי לקבל קישור אמיתי, יש להגדיר את משתנה הסביבה <code>VITE_PUBLIC_APP_URL</code>{' '}
            בעת בניית האפליקציה לכתובת שבה הפרונטנד מתארח כאתר רגיל.
          </Alert>
        )}
      </Paper>

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
          <TextField
            select
            size="small"
            label="סטטוס"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InstitutionStatus | '');
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">הכל</MenuItem>
            <MenuItem value={InstitutionStatus.Pending}>ממתין לאישור</MenuItem>
            <MenuItem value={InstitutionStatus.Active}>פעיל</MenuItem>
            <MenuItem value={InstitutionStatus.Suspended}>מושעה</MenuItem>
            <MenuItem value={InstitutionStatus.Rejected}>נדחה</MenuItem>
          </TextField>
        }
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            {row.status === InstitutionStatus.Pending && (
              <>
                <Button
                  size="small"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => setConfirmAction({ type: 'approve', institution: row })}
                >
                  אישור
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<CloseIcon />}
                  onClick={() => setConfirmAction({ type: 'reject', institution: row })}
                >
                  דחייה
                </Button>
              </>
            )}
            {row.status === InstitutionStatus.Active && (
              <Button
                size="small"
                color="warning"
                startIcon={<BlockIcon />}
                onClick={() => setConfirmAction({ type: 'suspend', institution: row })}
              >
                השעיה
              </Button>
            )}
            {row.status === InstitutionStatus.Suspended && (
              <Button
                size="small"
                color="success"
                startIcon={<ReplayIcon />}
                onClick={() => setConfirmAction({ type: 'reactivate', institution: row })}
              >
                הפעלה מחדש
              </Button>
            )}
          </Stack>
        )}
      />

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? actionLabels[confirmAction.type].title : ''}
        description={confirmAction ? `מוסד: "${confirmAction.institution.name}"` : ''}
        confirmLabel={confirmAction ? actionLabels[confirmAction.type].confirm : ''}
        danger={confirmAction ? actionLabels[confirmAction.type].danger : false}
        onConfirm={handleConfirm}
        onClose={() => setConfirmAction(null)}
      />
    </Box>
  );
}
