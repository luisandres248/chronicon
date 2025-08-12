"use client";

import { useContext } from "react";
import { useTranslation } from 'react-i18next';
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
import { formatDate } from "../utils/dateFormatter";
import Logo from "../components/Logo";

const Config = () => {
  const { config, updateConfig } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const theme = useTheme(); // useTheme hook to access current theme if needed for styling

  const handleThemeChange = (event) => {
    updateConfig({ theme: event.target.value });
  };

  const getThemeName = (themeValue) => {
    switch (themeValue) {
      case "light":
        return t('lightTheme');
      case "dark":
        return t('darkTheme');
      case "chronicon":
        return t('chroniconTheme');
      case "oceanBreeze":
        return t('oceanBreezeTheme');
      case "sunsetGlow":
        return t('sunsetGlowTheme');
      default:
        return t('unknownTheme');
    }
  };

  const today = new Date();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ width: 400, margin: '0 auto', mb: 4 }}>
        <Logo />
      </Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 500 }}>
        {t('configTitle')}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title={t('appearanceSectionTitle')}
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
                <InputLabel id="theme-select-label">{t('themeLabel')}</InputLabel>
                <Select
                  labelId="theme-select-label"
                  id="theme-select"
                  value={config.theme || 'chronicon'} // Ensure a default if somehow undefined
                  label={t('themeLabel')}
                  onChange={handleThemeChange}
                >
                  <MenuItem value="light">{t('lightTheme')}</MenuItem>
                  <MenuItem value="dark">{t('darkTheme')}</MenuItem>
                  <MenuItem value="chronicon">{t('chroniconTheme')}</MenuItem>
                  <MenuItem value="oceanBreeze">{t('oceanBreezeTheme')}</MenuItem>
                  <MenuItem value="sunsetGlow">{t('sunsetGlowTheme')}</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title={t('languageSectionTitle')}
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
                <InputLabel id="language-select-label">{t('languageLabel')}</InputLabel>
                <Select
                  labelId="language-select-label"
                  id="language-select"
                  value={i18n.language}
                  label={t('languageLabel')}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value);
                    updateConfig({ language: e.target.value });
                  }}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title={t('dateTimeSectionTitle')}
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
                <InputLabel id="date-format-select-label">{t('dateFormatLabel')}</InputLabel>
                <Select
                  labelId="date-format-select-label"
                  id="date-format-select"
                  value={config.dateFormat || 'PPP'}
                  label={t('dateFormatLabel')}
                  onChange={(e) => updateConfig({ dateFormat: e.target.value })}
                >
                  <MenuItem value="PPP">{formatDate(today, 'PPP', i18n.language)}</MenuItem>
                  <MenuItem value="dd/MM/yyyy">{formatDate(today, 'dd/MM/yyyy', i18n.language)}</MenuItem>
                  <MenuItem value="MM/dd/yyyy">{formatDate(today, 'MM/dd/yyyy', i18n.language)}</MenuItem>
                  <MenuItem value="yyyy-MM-dd">{formatDate(today, 'yyyy-MM-dd', i18n.language)}</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Config;
