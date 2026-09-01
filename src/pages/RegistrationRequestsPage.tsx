import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { registrationRequestsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { RegistrationRequest } from '../types';
import { RegistrationRequestStatus, FieldEntityType } from '../types';

const statusColor: Record<RegistrationRequestStatus, 'warning' | 'success' | 'error'> = {
  [RegistrationRequestStatus.Pending]: 'warning',
  [RegistrationRequestStatus.Approved]: 'success',
  [RegistrationRequestStatus.Rejected]: 'error',
};

const statusLabel: Record<RegistrationRequestStatus, string> = {
  [RegistrationRequestStatus.Pending]: 'ממתין',
  [RegistrationRequestStatus.Approved]: 'אושר',
  [RegistrationRequestStatus.Rejected]: 'נדחה',
};

const entityTypeLabel: Partial<Record<FieldEntityType, string>> = {
  [FieldEntityType.Participant]: 'תלמיד/ה',
  [FieldEntityType.Staff]: 'איש/אשת צוות',
};

export function RegistrationRequestsPage() {
  const notify = useNotify();
  const [items, setItems] = useState<RegistrationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<RegistrationRequestStatus | ''>(
    RegistrationRequestStatus.Pending,
  );
  const [loading, setLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState<RegistrationRequest | null>(null);
  const [createUserChecked, setCreateUserChecked] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; tempPassword: string } | null>(
    null,
  );

  const load = () => {
    setLoading(true);
    registrationRequestsApi
      .list({ page: page + 1, limit, status: status || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, limit, status]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    const entityType = approveTarget.entityType;
    setApproving(true);
    try {
      const result = await registrationRequestsApi.approve(approveTarget._id, createUserChecked);
      notify('הבקשה אושרה', 'success');
      setApproveTarget(null);
      if (result.username && result.tempPassword) {
        setCreatedCreds({ username: result.username, tempPassword: result.tempPassword });
      } else if (createUserChecked) {
        // Real gap this closes: silently no credentials, with no explanation,
        // is exactly the "student can't log in and nobody knows why" report.
        // For Participant this happens when the institution's
        // "מצב יצירת משתמשים למשתתפים" setting is 'אף פעם' — that setting
        // overrides the checkbox entirely (see Settings). Staff always
        // follows the checkbox directly, so this branch shouldn't happen
        // for Staff approvals, but the message stays generic just in case.
        notify(
          entityType === FieldEntityType.Participant
            ? 'לא נוצר חשבון התחברות — ב"הגדרות מוסד" מצב יצירת המשתמשים למשתתפים מוגדר ל"אף פעם". אפשר לשנות שם, או ליצור משתמש ידנית במסך "משתמשים".'
            : 'לא נוצר חשבון התחברות. אפשר ליצור אחד ידנית במסך "משתמשים".',
          'warning',
        );
      }
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await registrationRequestsApi.reject(rejectTarget._id);
      notify('הבקשה נדחתה', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<RegistrationRequest>[] = [
    { key: 'firstName', label: 'שם פרטי', render: (r) => r.requestedData.firstName },
    { key: 'lastName', label: 'שם משפחה', render: (r) => r.requestedData.lastName },
    {
      key: 'entityType',
      label: 'סוג',
      render: (r) => (
        <Chip size="small" variant="outlined" label={entityTypeLabel[r.entityType] ?? r.entityType} />
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (r) => <Chip size="small" label={statusLabel[r.status]} color={statusColor[r.status]} />,
    },
    {
      key: 'createdAt',
      label: 'תאריך בקשה',
      render: (r) => new Date(r.createdAt).toLocaleDateString('he-IL'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        בקשות הרשמה
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
          <TextField
            select
            size="small"
            label="סטטוס"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RegistrationRequestStatus | '');
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">הכל</MenuItem>
            <MenuItem value={RegistrationRequestStatus.Pending}>ממתין</MenuItem>
            <MenuItem value={RegistrationRequestStatus.Approved}>אושר</MenuItem>
            <MenuItem value={RegistrationRequestStatus.Rejected}>נדחה</MenuItem>
          </TextField>
        }
        actions={(row) =>
          row.status === RegistrationRequestStatus.Pending ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<CheckIcon />}
                color="success"
                onClick={() => {
                  setCreateUserChecked(true);
                  setApproveTarget(row);
                }}
              >
                אישור
              </Button>
              <Button
                size="small"
                startIcon={<CloseIcon />}
                color="error"
                onClick={() => setRejectTarget(row)}
              >
                דחייה
              </Button>
            </Stack>
          ) : null
        }
      />

      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>אישור בקשת הרשמה</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {approveTarget &&
              `לאשר את הבקשה של ${approveTarget.requestedData.firstName} ${approveTarget.requestedData.lastName}? תיווצר רשומת ${entityTypeLabel[approveTarget.entityType] ?? approveTarget.entityType}.`}
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={createUserChecked}
                onChange={(e) => setCreateUserChecked(e.target.checked)}
              />
            }
            label="צור גם פרטי התחברות (שם משתמש + סיסמה זמנית)"
          />
          {!createUserChecked && (
            <Alert severity="info" sx={{ mt: 1 }}>
              בלי סימון זה, הרשומה תיווצר אך לא ייווצר חשבון התחברות — אפשר ליצור אחד מאוחר יותר
              במסך "משתמשים".
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>ביטול</Button>
          <Button variant="contained" onClick={handleApprove} disabled={approving}>
            אישור
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!createdCreds} onClose={() => setCreatedCreds(null)} maxWidth="xs" fullWidth>
        <DialogTitle>נוצרו פרטי התחברות</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            יש למסור את הפרטים הבאים למשתמש. הסיסמה הזמנית מוצגת פעם אחת בלבד — לא ניתן לשחזר
            אותה לאחר סגירת החלון.
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
        open={!!rejectTarget}
        title="דחיית בקשת הרשמה"
        description={
          rejectTarget
            ? `לדחות את הבקשה של ${rejectTarget.requestedData.firstName} ${rejectTarget.requestedData.lastName}?`
            : ''
        }
        confirmLabel="דחייה"
        danger
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
      />
    </Box>
  );
}
