import { useState, type ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Collapse from '@mui/material/Collapse';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CustomFieldValue, FieldDefinition } from '../types';

export interface CardEntity {
  _id: string;
  firstName: string;
  lastName: string;
  customFields: CustomFieldValue[];
  createdAt: string;
}

interface Props<T extends CardEntity> {
  items: T[];
  fieldDefinitions: FieldDefinition[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  toolbar?: ReactNode;
  /** Optional extra content rendered on the collapsed (basic) card face, e.g. group chips. */
  renderBasic?: (item: T) => ReactNode;
}

/**
 * Card view for Participants/Staff — real request: "לראות כרטיס עם נתונים
 * בסיסיים, ולחיצה על כפתור מציגה את כל הנתונים" (a card with basic data,
 * click a button to see everything). Basic face = name + created date;
 * expanding reveals every custom field labeled by its real displayName
 * (never the raw internalKey), same lookup pattern already used in
 * RegistrationRequestsPage's details view.
 */
export function EntityCardGrid<T extends CardEntity>({
  items,
  fieldDefinitions,
  total,
  page,
  limit,
  loading,
  search,
  onSearchChange,
  onPageChange,
  onLimitChange,
  onEdit,
  onDelete,
  toolbar,
  renderBasic,
}: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fieldLabel = (key: string) => fieldDefinitions.find((f) => f.internalKey === key)?.displayName ?? key;

  const initials = (item: T) => `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {onSearchChange && (
          <TextField
            size="small"
            placeholder="חיפוש..."
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        {toolbar}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          לא נמצאו רשומות
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => {
            const isOpen = expanded.has(item._id);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(item)}</Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" noWrap>
                          {item.firstName} {item.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          נרשם/ה בתאריך {new Date(item.createdAt).toLocaleDateString('he-IL')}
                        </Typography>
                      </Box>
                    </Stack>
                    {renderBasic && <Box sx={{ mt: 1 }}>{renderBasic(item)}</Box>}

                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <Divider sx={{ my: 1.5 }} />
                      {item.customFields.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          אין שדות נוספים.
                        </Typography>
                      ) : (
                        <Stack spacing={0.75}>
                          {item.customFields.map((f) => (
                            <Box key={f.k}>
                              <Typography variant="caption" color="text.secondary">
                                {fieldLabel(f.k)}
                              </Typography>
                              <Typography variant="body2">{String(f.v)}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Collapse>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      endIcon={
                        <ExpandMoreIcon
                          sx={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                        />
                      }
                      onClick={() => toggleExpanded(item._id)}
                    >
                      {isOpen ? 'הצג פחות' : 'הצג הכל'}
                    </Button>
                    {(onEdit || onDelete) && (
                      <Stack direction="row">
                        {onEdit && (
                          <IconButton size="small" onClick={() => onEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {onDelete && (
                          <IconButton size="small" color="error" onClick={() => onDelete(item)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={limit}
        onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[6, 12, 24, 48]}
        labelRowsPerPage="כרטיסים בעמוד"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} מתוך ${count}`}
      />
    </Box>
  );
}
