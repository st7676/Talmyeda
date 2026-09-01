import { Link as RouterLink } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import TuneIcon from '@mui/icons-material/Tune';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import DomainIcon from '@mui/icons-material/Domain';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import type { ReactNode } from 'react';

const cards: { label: string; desc: string; path: string; icon: ReactNode; roles: Role[] }[] = [
  { label: 'מוסדות', desc: 'אישור/השעיה של מוסדות בפלטפורמה', path: '/platform/institutions', icon: <DomainIcon fontSize="large" />, roles: [Role.SuperAdmin] },
  { label: 'הפרופיל שלי', desc: 'צפייה ועדכון הפרטים שלך', path: '/my-profile', icon: <PersonIcon fontSize="large" />, roles: [Role.Participant] },
  { label: 'משתתפים', desc: 'ניהול משתתפי המוסד', path: '/participants', icon: <GroupIcon fontSize="large" />, roles: [Role.Admin, Role.Staff] },
  { label: 'צוות', desc: 'ניהול אנשי הצוות', path: '/staff', icon: <BadgeIcon fontSize="large" />, roles: [Role.Admin] },
  { label: 'קבוצות', desc: 'ניהול קבוצות ושיוכים', path: '/groups', icon: <Diversity3Icon fontSize="large" />, roles: [Role.Admin, Role.Staff, Role.Participant] },
  { label: 'בקשות הרשמה', desc: 'אישור/דחיית בקשות הרשמה', path: '/registration-requests', icon: <HowToRegIcon fontSize="large" />, roles: [Role.Admin] },
  { label: 'שדות מותאמים', desc: 'הגדרת שדות דינמיים', path: '/field-definitions', icon: <TuneIcon fontSize="large" />, roles: [Role.Admin] },
  { label: 'משתמשים', desc: 'ניהול משתמשי מערכת', path: '/users', icon: <ManageAccountsIcon fontSize="large" />, roles: [Role.Admin] },
  { label: 'הגדרות מוסד', desc: 'תצורת המוסד', path: '/settings', icon: <SettingsIcon fontSize="large" />, roles: [Role.Admin] },
];

export function DashboardPage() {
  const { claims } = useAuth();
  const visible = cards.filter((c) => !claims || c.roles.includes(claims.role));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        לוח בקרה
      </Typography>
      <Grid container spacing={2}>
        {visible.map((c) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.path}>
            <Card>
              <CardActionArea component={RouterLink} to={c.path}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {c.icon}
                  <Box>
                    <Typography variant="h6">{c.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {c.desc}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
