import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  participantGroupsApi,
  staffGroupsApi,
  participantsApi,
  staffApi,
} from '../api/endpoints';
import { getErrorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import type { Group, Participant, Staff } from '../types';

interface Props {
  group: Group;
  onClose: () => void;
}

/**
 * Real gap this closes: assign/remove endpoints existed on the backend but
 * were never wired into any screen, and there wasn't even a way to list a
 * group's current members until this session added GET /participant-groups
 * and /staff-groups with a groupId filter. This dialog is the first UI ever
 * built against them.
 */
export function GroupMembersDialog({ group, onClose }: Props) {
  const [tab, setTab] = useState<'participants' | 'staff'>('participants');

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>חברי הקבוצה — {group.name}</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab value="participants" label="תלמידים" />
        <Tab value="staff" label="צוות" />
      </Tabs>
      <DialogContent>
        {tab === 'participants' ? (
          <ParticipantMembers groupId={group._id} />
        ) : (
          <StaffMembers groupId={group._id} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>סגירה</Button>
      </DialogActions>
    </Dialog>
  );
}

function ParticipantMembers({ groupId }: { groupId: string }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [memberships, setMemberships] = useState<{ id: string; participantId: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      participantsApi.list({ page: 1, limit: 100 }),
      participantGroupsApi.listForGroup(groupId),
    ])
      .then(([participantsRes, membershipsRes]) => {
        setAllParticipants(participantsRes.items);
        setMemberships(
          membershipsRes.map((m) => ({ id: m._id, participantId: m.participantId })),
        );
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [groupId]);

  const byId = useMemo(
    () => new Map(allParticipants.map((p) => [p._id, p])),
    [allParticipants],
  );
  const memberIds = useMemo(() => new Set(memberships.map((m) => m.participantId)), [memberships]);
  const available = allParticipants.filter((p) => !memberIds.has(p._id));

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await participantGroupsApi.assign(selected, groupId);
      setSelected('');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (membershipId: string) => {
    try {
      await participantGroupsApi.remove(membershipId);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <List dense>
        {memberships.length === 0 ? (
          <Typography color="text.secondary">אין תלמידים משויכים לקבוצה זו.</Typography>
        ) : (
          memberships.map((m) => {
            const p = byId.get(m.participantId);
            return (
              <ListItem
                key={m.id}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => handleRemove(m.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText primary={p ? `${p.firstName} ${p.lastName}` : m.participantId} />
              </ListItem>
            );
          })
        )}
      </List>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label="הוספת תלמיד/ה"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          fullWidth
        >
          {available.map((p) => (
            <MenuItem key={p._id} value={p._id}>
              {p.firstName} {p.lastName}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAdd}
          disabled={adding || !selected}
        >
          הוספה
        </Button>
      </Stack>
    </Stack>
  );
}

function StaffMembers({ groupId }: { groupId: string }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [memberships, setMemberships] = useState<{ id: string; staffId: string; roleDescription: string | null }[]>(
    [],
  );
  const [selected, setSelected] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([staffApi.list({ page: 1, limit: 100 }), staffGroupsApi.listForGroup(groupId)])
      .then(([staffRes, membershipsRes]) => {
        setAllStaff(staffRes.items);
        setMemberships(
          membershipsRes.map((m) => ({
            id: m._id,
            staffId: m.staffId,
            roleDescription: m.roleDescription,
          })),
        );
      })
      .catch((err) => notify(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [groupId]);

  const byId = useMemo(() => new Map(allStaff.map((s) => [s._id, s])), [allStaff]);
  const memberIds = useMemo(() => new Set(memberships.map((m) => m.staffId)), [memberships]);
  const available = allStaff.filter((s) => !memberIds.has(s._id));

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await staffGroupsApi.assign(selected, groupId);
      setSelected('');
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (membershipId: string) => {
    try {
      await staffGroupsApi.remove(membershipId);
      load();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <List dense>
        {memberships.length === 0 ? (
          <Typography color="text.secondary">אין אנשי צוות משויכים לקבוצה זו.</Typography>
        ) : (
          memberships.map((m) => {
            const s = byId.get(m.staffId);
            return (
              <ListItem
                key={m.id}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => handleRemove(m.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={s ? `${s.firstName} ${s.lastName}` : m.staffId}
                  secondary={m.roleDescription}
                />
              </ListItem>
            );
          })
        )}
      </List>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label="הוספת איש/אשת צוות"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          fullWidth
        >
          {available.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.firstName} {s.lastName}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAdd}
          disabled={adding || !selected}
        >
          הוספה
        </Button>
      </Stack>
    </Stack>
  );
}
