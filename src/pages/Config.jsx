"use client";

import { useContext } from "react";
import {
  Typography,
  Switch,
  FormControlLabel,
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
import { DarkMode, WbSunny, CalendarMonth } from "@mui/icons-material";
import { GlobalContext } from "../context/GlobalContext";

const Config = () => {
  const { config, updateConfig } = useContext(GlobalContext);
  const theme = useTheme();

  const handleDarkModeChange = (event) => {
    updateConfig({ darkMode: event.target.checked });
  };

  const handleFirstDayChange = (event) => {
    updateConfig({ firstDayOfWeek: event.target.value });
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WbSunny sx={{ color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#f9a825', mr: 1 }} />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.darkMode} 
                      onChange={handleDarkModeChange}
                      color="primary"
                    />
                  }
                  label=""
                />
                <DarkMode sx={{ color: theme.palette.mode === 'dark' ? '#90caf9' : theme.palette.text.secondary, ml: 1 }} />
                <Typography sx={{ ml: 2 }}>
                  {config.darkMode ? 'Modo oscuro activado' : 'Modo claro activado'}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                El modo oscuro reduce la fatiga visual en entornos con poca luz y ahorra batería en dispositivos con pantallas OLED.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Calendario" 
              sx={{ 
                borderBottom: `1px solid ${theme.palette.divider}`,
                '& .MuiCardHeader-title': {
                  fontSize: '1.2rem',
                  fontWeight: 500,
                }
              }}
            />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CalendarMonth sx={{ mr: 2, color: theme.palette.primary.main }} />
                <FormControl fullWidth>
                  <InputLabel id="first-day-label">Primer día de la semana</InputLabel>
                  <Select
                    labelId="first-day-label"
                    value={config.firstDayOfWeek || "sunday"}
                    onChange={handleFirstDayChange}
                  >
                    <MenuItem value="sunday">Domingo</MenuItem>
                    <MenuItem value="monday">Lunes</MenuItem>
                    <MenuItem value="saturday">Sábado</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Configura el primer día de la semana según tus preferencias regionales o personales.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, p: 2, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)' }}>
        <Typography variant="body2" color="text.secondary">
          Los cambios en la configuración se aplican inmediatamente y se guardan automáticamente para futuras sesiones.
        </Typography>
      </Box>
    </Box>
  );
};

export default Config;
