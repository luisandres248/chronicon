"use client";

import { useContext } from "react";
import {
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Box,
  Divider,
  useTheme,
  Grid,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
// Removed WbSunny and DarkMode icons as they are no longer used with the Select
import { GlobalContext } from "../context/GlobalContext";

const Config = () => {
  const { config, updateConfig } = useContext(GlobalContext);
  const theme = useTheme(); // useTheme hook to access current theme if needed for styling

  const handleThemeChange = (event) => {
    updateConfig({ theme: event.target.value });
  };

  const getThemeName = (themeValue) => {
    switch (themeValue) {
      case "light":
        return "Claro";
      case "dark":
        return "Oscuro";
      case "chronicon":
        return "Chronicon";
      default:
        return "Desconocido";
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 500 }}>
        Configuración
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Apariencia" 
              sx={{ 
                borderBottom: `1px solid ${theme.palette.divider}`,
                '& .MuiCardHeader-title': {
                  fontSize: '1.2rem',
                  fontWeight: 500,
                }
              }}
            />
            <CardContent>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="theme-select-label">Tema</InputLabel>
                <Select
                  labelId="theme-select-label"
                  id="theme-select"
                  value={config.theme || 'chronicon'} // Ensure a default if somehow undefined
                  label="Tema"
                  onChange={handleThemeChange}
                >
                  <MenuItem value="light">Claro</MenuItem>
                  <MenuItem value="dark">Oscuro</MenuItem>
                  <MenuItem value="chronicon">Chronicon</MenuItem>
                </Select>
              </FormControl>
              
              <Typography sx={{ mb: 2 }}>
                Tema actual: {getThemeName(config.theme)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Selecciona tu tema preferido. El tema "Chronicon" es el nuevo tema oscuro por defecto, ofreciendo una experiencia visual cohesiva. Todos los temas oscuros ayudan a reducir la fatiga visual en condiciones de poca luz.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, p: 2, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)' }}>
        <Typography variant="body2" color="text.secondary">
          Los cambios en la configuración de apariencia se aplican inmediatamente y se guardan automáticamente para futuras sesiones.
        </Typography>
      </Box>
    </Box>
  );
};

export default Config;
