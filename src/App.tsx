import CssBaseline from '@mui/material/CssBaseline'
import { AppBar, Container, Toolbar, Typography } from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import BomTable from './BomTable';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar
        position="static"
        color="default"
        elevation={0}
        enableColorOnDark
      >
        <Toolbar sx={{ flexWrap: 'wrap' }}>
          <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            Software Bill of Materials
          </Typography>
        </Toolbar>
      </AppBar>
      <main>
        <Container maxWidth="xl">
          <BomTable />
        </Container>
      </main>
    </ThemeProvider>
  )
}

export default App
