import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

function Navbar() {
  const { t } = useTranslation();
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: '"Roboto Mono", monospace', fontWeight: 700, fontSize: '1.5rem' }}>
          Chronicon
        </Typography>
        <Button color="inherit" component={Link} to="/">
          {t('eventGridLink')}
        </Button>
        <Button color="inherit" component={Link} to="/calendar">
          {t('calendarLink')}
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
