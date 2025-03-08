import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Calendario de Eventos
        </Typography>
        <Button color="inherit" component={Link} to="/">
          Grid de Eventos
        </Button>
        <Button color="inherit" component={Link} to="/calendar">
          Calendario
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
