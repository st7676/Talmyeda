import { createTheme } from '@mui/material/styles';

// עיצוב חם ונגיש בהשראת ארגוני חסד/רפואה ישראליים: כחול-פטרול עמוק ליציבות
// ואמינות, זהב/כתום חמים לחום אנושי, רקע קרם רך, גופנים גדולים יותר ורכיבים
// עגולים ונוחים ללחיצה — נגיש גם לאוכלוסייה מבוגרת.
export const theme = createTheme({
  palette: {
    primary: { main: '#0F5C73', light: '#3D7F94', dark: '#0A4453', contrastText: '#fff' },
    secondary: { main: '#D98324', light: '#E6A559', dark: '#B06A1A', contrastText: '#fff' },
    error: { main: '#C0392B' },
    warning: { main: '#D98324' },
    success: { main: '#3F8759' },
    background: { default: '#FAF6EF', paper: '#FFFFFF' },
    text: { primary: '#28323A', secondary: '#5A6670' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ['Assistant', 'Rubik', 'Roboto', 'Arial', 'sans-serif'].join(','),
    fontSize: 15,
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  direction: 'rtl',
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingTop: 8, paddingBottom: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#0F5C73' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
