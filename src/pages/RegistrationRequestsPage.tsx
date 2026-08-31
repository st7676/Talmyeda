import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { registrationRequestsApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { RegistrationRequest } from '../types';
import { RegistrationRequestStatus } from '../types';

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
  const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);

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

  const handleApprove = async (createUser: boolean) => {
    if (!approveTarget) return;
    try {
      await registrationRequestsApi.approve(approveTarget._id, createUser);
      notify('הבקשה אושרה', 'success');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
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
                onClick={() => setApproveTarget(row)}
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

      <ConfirmDialog
        open={!!approveTarget}
        title="אישור בקשת הרשמה"
        description={
          approveTarget
            ? `לאשר את הבקשה של ${approveTarget.requestedData.firstName} ${approveTarget.requestedData.lastName}? תיווצר רשומת משתתף.`
            : ''
        }
        confirmLabel="אישור"
        onConfirm={() => handleApprove(false)}
        onClose={() => setApproveTarget(null)}
      />
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
