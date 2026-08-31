import { createTheme } from '@mui/material/styles';

// Google Material Design palette
export const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' }, // Google Blue
    secondary: { main: '#34a853' }, // Google Green
    error: { main: '#ea4335' }, // Google Red
    warning: { main: '#fbbc04' }, // Google Yellow
    background: { default: '#f8f9fa' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['Roboto', 'Arial', 'sans-serif'].join(','),
  },
  direction: 'rtl',
});
