import { useState } from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
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

const drawerWidth = 240;

const navItems: { label: string; path: string; icon: ReactNode; roles: Role[] }[] = [
  { label: 'לוח בקרה', path: '/', icon: <DashboardIcon />, roles: [Role.Admin, Role.Staff, Role.Participant] },
  { label: 'משתתפים', path: '/participants', icon: <GroupIcon />, roles: [Role.Admin, Role.Staff] },
  { label: 'צוות', path: '/staff', icon: <BadgeIcon />, roles: [Role.Admin] },
  { label: 'קבוצות', path: '/groups', icon: <Diversity3Icon />, roles: [Role.Admin, Role.Staff, Role.Participant] },
  { label: 'בקשות הרשמה', path: '/registration-requests', icon: <HowToRegIcon />, roles: [Role.Admin] },
  { label: 'שדות מותאמים', path: '/field-definitions', icon: <TuneIcon />, roles: [Role.Admin] },
  { label: 'משתמשים', path: '/users', icon: <ManageAccountsIcon />, roles: [Role.Admin] },
  { label: 'הגדרות מוסד', path: '/settings', icon: <SettingsIcon />, roles: [Role.Admin] },
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { claims, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => !claims || item.roles.includes(claims.role));

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
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            תלמידה
          </Typography>
          {claims && <Chip label={claims.role} color="secondary" size="small" sx={{ ml: 2 }} />}
          <IconButton color="inherit" onClick={handleLogout} title="התנתקות">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="right"
        open={open}
        sx={{
          width: open ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {visibleItems.map((item) => (
            <ListItemButton key={item.path} component={RouterLink} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
