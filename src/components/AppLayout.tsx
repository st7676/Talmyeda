import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import BadgeIcon from '@mui/icons-material/Badge';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import TuneIcon from '@mui/icons-material/Tune';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import type { ReactNode } from 'react';

const drawerWidth = 250;

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: Role[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'ראשי',
    items: [
      { label: 'לוח בקרה', path: '/', icon: <DashboardIcon />, roles: [Role.Admin, Role.Staff, Role.Participant] },
      { label: 'הפרופיל שלי', path: '/my-profile', icon: <PersonIcon />, roles: [Role.Participant] },
    ],
  },
  {
    title: 'ניהול אנשים',
    items: [
      { label: 'משתתפים', path: '/participants', icon: <GroupIcon />, roles: [Role.Admin, Role.Staff] },
      { label: 'צוות', path: '/staff', icon: <BadgeIcon />, roles: [Role.Admin] },
      { label: 'קבוצות', path: '/groups', icon: <Diversity3Icon />, roles: [Role.Admin, Role.Staff, Role.Participant] },
      { label: 'בקשות הרשמה', path: '/registration-requests', icon: <HowToRegIcon />, roles: [Role.Admin] },
    ],
  },
  {
    title: 'הגדרות מערכת',
    items: [
      { label: 'שדות מותאמים', path: '/field-definitions', icon: <TuneIcon />, roles: [Role.Admin] },
      { label: 'משתמשים', path: '/users', icon: <ManageAccountsIcon />, roles: [Role.Admin] },
      { label: 'הגדרות מוסד', path: '/settings', icon: <SettingsIcon />, roles: [Role.Admin] },
    ],
  },
];

const roleLabel: Record<Role, string> = {
  [Role.SuperAdmin]: 'מנהל-על',
  [Role.Admin]: 'מנהל',
  [Role.Staff]: 'צוות',
  [Role.Participant]: 'משתתף',
};

export function AppLayout() {
  const [open, setOpen] = useState(true);
  const { claims, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !claims || item.roles.includes(claims.role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ ml: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
            תלמידה
          </Typography>
          {claims && (
            <Chip label={roleLabel[claims.role]} color="secondary" size="small" sx={{ ml: 2 }} />
          )}
          <Tooltip title="התנתקות">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="right"
        open={open}
        sx={{
          width: open ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 700 }}>
            {claims?.role?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {claims ? roleLabel[claims.role] : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              מחוברת למערכת
            </Typography>
          </Box>
        </Box>
        <Divider />
        {visibleSections.map((section) => (
          <List
            key={section.title}
            subheader={
              <ListSubheader
                component="div"
                sx={{ bgcolor: 'transparent', lineHeight: '32px', fontWeight: 600 }}
              >
                {section.title}
              </ListSubheader>
            }
          >
            {section.items.map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  selected={active}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: (t) => t.transitions.create('margin', { duration: t.transitions.duration.short }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
