import React, { useState, useEffect, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { 
  Select, 
  MenuItem, 
  Box, 
  Typography, 
  Paper, 
  Divider,
  CircularProgress,
  Badge,
  Chip,
  IconButton,
  Tooltip,
  Zoom,
  Grid,
  useTheme,
  Snackbar,
  Alert,
  Slider,
  Stack,
  Button
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { 
  Edit, 
  CalendarMonth, 
  AccessTime, 
  Repeat, 
  LocalOffer, 
  Update, 
  KeyboardArrowDown,
  ZoomIn,
  ZoomOut
} from "@mui/icons-material";
import { format, differenceInDays, differenceInMonths, differenceInYears, differenceInSeconds, differenceInHours, differenceInMinutes, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getMonth, getYear, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { GlobalContext } from "../context/GlobalContext";
import { groupEventsByName, formatTimeSince, createEventObject } from "../services/eventService";
import { updateEvent as updateGoogleEvent, signIn } from "../services/googleService";
import EventForm from "./EventForm";

// Componente para mostrar estadísticas en chips interactivos
const StatChip = ({ title, values, icon, color = "default", variant = "outlined" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const theme = useTheme();
  
  // Asegurar que values sea un array
  const valueArray = Array.isArray(values) ? values : [values];
  
  // Si solo hay un valor, no necesitamos interactividad
  const isInteractive = valueArray.length > 1;
  
  const handleClick = () => {
    if (!isInteractive || animating) return;
    
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % valueArray.length);
      setAnimating(false);
    }, 150);
  };
  
  return (
    <Box 
      sx={{ 
        position: 'relative',
        mb: 1.5,
        mr: 1.5,
        display: 'inline-block',
        minWidth: '180px',
      }}
    >
      <Paper
        elevation={1}
        onClick={handleClick}
        sx={{
          borderRadius: '12px',
          transition: 'all 0.15s ease-in-out',
          transform: animating ? 'translateY(-2px)' : 'translateY(0)',
          opacity: animating ? 0.9 : 1,
          '&:hover': {
            boxShadow: isInteractive ? 2 : 1,
            cursor: isInteractive ? 'pointer' : 'default',
          },
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Encabezado */}
        <Box 
          sx={{ 
            p: 1, 
            pl: 1.5,
            pr: 1.5,
            display: 'flex', 
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {icon && (
            <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              {React.cloneElement(icon, { 
                fontSize: 'small',
                sx: { color: theme.palette.text.secondary }
              })}
            </Box>
          )}
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 500,
              color: theme.palette.text.primary
            }}
          >
            {title}
          </Typography>
        </Box>
        
        {/* Contenido */}
        <Box 
          sx={{ 
            p: 1, 
            pl: 1.5,
            pr: 1.5,
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: 'center',
              color: theme.palette.text.primary
            }}
          >
            {valueArray[currentIndex]}
          </Typography>
        </Box>
      </Paper>
      
      {isInteractive && (
        <>
          <Box 
            sx={{
              position: 'absolute',
              bottom: -3,
              left: 3,
              right: -3,
              width: '100%',
              height: '100%',
              borderRadius: '12px',
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              zIndex: 1,
            }}
          />
          {valueArray.length > 2 && (
            <Box 
              sx={{
                position: 'absolute',
                bottom: -6,
                left: 6,
                right: -6,
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                zIndex: 0,
              }}
            />
          )}
        </>
      )}
    </Box>
  );
};

// Componente para mostrar un mes en el calendario personalizado
const MonthCalendar = ({ month, highlightedDates, eventColor, monthsPerRow, size }) => {
  const theme = useTheme();
  const defaultColor = theme.palette.mode === 'dark' ? '#1976d2' : '#2196f3';
  const eventColorToUse = eventColor || defaultColor;
  
  // Calcular días del mes
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });
  
  // Determinar si un día tiene un evento
  const getEventIndex = (day) => {
    return highlightedDates.findIndex(d => isSameDay(d, day));
  };
  
  // Determinar si un día está entre la primera ocurrencia y hoy
  const isInActiveRange = (day) => {
    if (!highlightedDates.length) return false;
    const firstDate = highlightedDates[0];
    const today = new Date();
    return day >= firstDate && day <= today;
  };
  
  // Calcular tamaño de los días basado en el parámetro size (1-100)
  const daySize = 16 + (size / 10); // 16px mínimo, aumenta con el tamaño
  
  return (
    <Box 
      sx={{ 
        p: 1, 
        width: `${100 / monthsPerRow}%`,
        minWidth: '200px',
        boxSizing: 'border-box'
      }}
    >
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          mb: 1, 
          fontWeight: 500,
          textAlign: 'center',
          color: theme.palette.text.secondary
        }}
      >
        {format(month, 'MMMM', { locale: es })}
      </Typography>
      
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {daysInMonth.map(day => {
          const eventIndex = getEventIndex(day);
          const hasEvent = eventIndex !== -1;
          const isFirstOccurrence = eventIndex === 0;
          const inRange = isInActiveRange(day);
          
          return (
            <Box 
              key={day.toString()}
              sx={{
                width: `${daySize}px`,
                height: `${daySize}px`,
                backgroundColor: hasEvent 
                  ? (isFirstOccurrence 
                    ? eventColorToUse 
                    : theme.palette.mode === 'dark' 
                      ? theme.palette.secondary.dark 
                      : theme.palette.secondary.light)
                  : inRange 
                    ? theme.palette.mode === 'dark'
                      ? alpha(eventColorToUse, 0.15)
                      : alpha(eventColorToUse, 0.1)
                    : 'transparent',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                margin: '1px',
                border: hasEvent 
                  ? `1px solid ${eventColorToUse}`
                  : inRange
                    ? `1px solid ${alpha(eventColorToUse, 0.3)}`
                    : '1px solid transparent',
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: `${daySize / 2.5}px`,
                  color: hasEvent 
                    ? theme.palette.getContrastText(
                        isFirstOccurrence 
                          ? eventColorToUse 
                          : theme.palette.mode === 'dark' 
                            ? theme.palette.secondary.dark 
                            : theme.palette.secondary.light
                      )
                    : theme.palette.text.secondary,
                  opacity: inRange || hasEvent ? 1 : 0.5,
                }}
              >
                {format(day, 'd')}
              </Typography>
              
              {hasEvent && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isFirstOccurrence 
                      ? theme.palette.common.white
                      : eventColorToUse,
                    border: isFirstOccurrence 
                      ? `1px solid ${eventColorToUse}`
                      : 'none',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// Componente para mostrar un separador de año
const YearSeparator = ({ year }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      width: '100%', 
      my: 2,
      px: 2
    }}>
      <Divider sx={{ flexGrow: 1 }} />
      <Typography 
        variant="subtitle2" 
        sx={{ 
          px: 2, 
          fontWeight: 400,
          color: theme.palette.text.secondary,
          fontSize: '0.9rem'
        }}
      >
        {year}
      </Typography>
      <Divider sx={{ flexGrow: 1 }} />
    </Box>
  );
};

function EventCalendar() {
  const location = useLocation();
  const { 
    events, 
    loading, 
    error, 
    updateEvent: updateEventInState,
    calendar,
    user,
    setUser,
    setCalendar
  } = useContext(GlobalContext);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [eventOccurrences, setEventOccurrences] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEventObject, setSelectedEventObject] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [calendarSize, setCalendarSize] = useState(50); // Valor entre 1-100
  const [monthsPerRow, setMonthsPerRow] = useState(3);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const theme = useTheme();

  // Agrupar eventos por nombre usando la función del servicio
  const eventsByName = useMemo(() => {
    return groupEventsByName(events);
  }, [events]);

  // Inicializar el evento seleccionado desde la navegación o el primer evento disponible
  useEffect(() => {
    if (location.state?.selectedEvent) {
      setSelectedEvent(location.state.selectedEvent);
    } else if (Object.keys(eventsByName).length > 0 && !selectedEvent) {
      setSelectedEvent(Object.keys(eventsByName)[0]);
    }
  }, [location.state, eventsByName, selectedEvent]);

  // Actualizar fechas destacadas cuando se selecciona un evento
  useEffect(() => {
    if (!selectedEvent || !events.length) return;

    // Obtener ocurrencias del evento seleccionado
    const occurrences = eventsByName[selectedEvent] || [];
    setEventOccurrences(occurrences);

    if (occurrences.length > 0) {
      // Extraer todas las fechas para resaltar en el calendario
      const dates = occurrences.map(event => event.startDate);
      setHighlightedDates(dates);

      // Calcular estadísticas
      const firstOccurrence = occurrences[0];
      const lastOccurrence = occurrences[occurrences.length - 1];
      const today = new Date();

      const stats = {
        firstDate: firstOccurrence.startDate,
        lastDate: lastOccurrence.startDate,
        totalOccurrences: occurrences.length,
        daysSinceFirst: differenceInDays(today, firstOccurrence.startDate),
        monthsSinceFirst: differenceInMonths(today, firstOccurrence.startDate),
        yearsSinceFirst: differenceInYears(today, firstOccurrence.startDate),
        daysSinceLast: differenceInDays(today, lastOccurrence.startDate),
        secondsSinceFirst: differenceInSeconds(today, firstOccurrence.startDate),
        minutesSinceFirst: differenceInMinutes(today, firstOccurrence.startDate),
        hoursSinceFirst: differenceInHours(today, firstOccurrence.startDate),
        tags: firstOccurrence.tags || [],
      };

      // Si hay más de una ocurrencia, calcular promedios
      if (occurrences.length > 1) {
        let totalGapDays = 0;
        for (let i = 1; i < occurrences.length; i++) {
          totalGapDays += differenceInDays(
            occurrences[i].startDate,
            occurrences[i - 1].startDate
          );
        }
        stats.averageGapDays = Math.round(totalGapDays / (occurrences.length - 1));
      }

      setEventStats(stats);
      setSelectedEventObject(firstOccurrence);
    } else {
      setHighlightedDates([]);
      setEventStats(null);
      setSelectedEventObject(null);
    }
  }, [selectedEvent, events, eventsByName]);

  // Generar los meses a mostrar en el calendario
  const calendarMonths = useMemo(() => {
    if (!eventStats || !eventOccurrences.length) return [];
    
    const firstDate = eventOccurrences[0].startDate;
    const today = new Date();
    const months = [];
    
    // Agrupar por año y mes
    const yearMonths = {};
    
    let currentDate = startOfMonth(firstDate);
    const endDate = startOfMonth(today);
    
    while (currentDate <= endDate) {
      const year = getYear(currentDate);
      if (!yearMonths[year]) {
        yearMonths[year] = [];
      }
      
      yearMonths[year].push(new Date(currentDate));
      currentDate = addMonths(currentDate, 1);
    }
    
    return yearMonths;
  }, [eventStats, eventOccurrences]);

  // Ajustar meses por fila basado en el tamaño
  useEffect(() => {
    // Ajustar meses por fila basado en el tamaño del calendario
    if (calendarSize < 30) {
      setMonthsPerRow(4);
    } else if (calendarSize < 60) {
      setMonthsPerRow(3);
    } else if (calendarSize < 80) {
      setMonthsPerRow(2);
    } else {
      setMonthsPerRow(1);
    }
  }, [calendarSize]);

  // Escuchar eventos de bloqueo de popup
  useEffect(() => {
    const handlePopupBlocked = (event) => {
      console.log("Popup blocked event received:", event.detail);
      setPopupBlocked(true);
      setAuthError(event.detail.message || "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio.");
    };

    window.addEventListener('auth-popup-blocked', handlePopupBlocked);

    return () => {
      window.removeEventListener('auth-popup-blocked', handlePopupBlocked);
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setPopupBlocked(false);
      const response = await signIn();
      if (response?.userProfile) {
        console.log("Sign in successful:", response);
        setUser(response.userProfile);
        setCalendar(response.calendar);
      }
    } catch (error) {
      if (error?.error !== "popup_closed_by_user") {
        console.error("Error signing in:", error);
        setAuthError(error.message || "Error al iniciar sesión. Por favor, intenta de nuevo.");
        
        // Verificar si el error está relacionado con popups
        if (error.type === 'popup_failed_to_open' || error.type === 'popup_closed') {
          setPopupBlocked(true);
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };

  const handleEditClick = () => {
    setFormOpen(true);
  };

  const handleUpdateEvent = async (formData) => {
    if (!calendar?.id || !selectedEventObject?.id) {
      console.error("Missing calendar ID or event ID");
      setSnackbar({
        open: true,
        message: "Error: Falta información del calendario o evento",
        severity: "error"
      });
      return;
    }

    try {
      setProcessing(true);
      console.log("Updating event with data:", {
        original: selectedEventObject,
        formData: formData
      });
      
      // Crear objeto de evento asegurando que se incluyan todos los campos necesarios
      const eventObject = createEventObject({
        id: selectedEventObject.id,
        name: formData.name || selectedEventObject.name,
        startDate: formData.startDate || selectedEventObject.startDate,
        description: formData.description !== undefined ? formData.description : selectedEventObject.description,
        color: formData.color || selectedEventObject.color,
        tags: formData.tags || selectedEventObject.tags,
      });
      
      console.log("Event object for update:", eventObject);
      
      const updatedEvent = await updateGoogleEvent(
        calendar.id,
        selectedEventObject.id,
        eventObject
      );
      
      console.log("Response from Google Calendar update:", updatedEvent);
      
      if (updatedEvent) {
        updateEventInState(updatedEvent);
        setFormOpen(false);
        
        // Si se cambió el nombre del evento, actualizar la selección
        if (formData.name && formData.name !== selectedEvent) {
          setSelectedEvent(formData.name);
        }
        
        setSnackbar({
          open: true,
          message: "Evento actualizado correctamente",
          severity: "success"
        });
      } else {
        throw new Error("Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      setSnackbar({
        open: true,
        message: `Error al actualizar el evento: ${error.message || "Error desconocido"}`,
        severity: "error"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSizeChange = (event, newValue) => {
    setCalendarSize(newValue);
  };

  // Formatear tiempo transcurrido en diferentes formatos
  const formatTimeElapsed = (stats) => {
    if (!stats) return [];
    
    const formats = [
      // Formato días
      `${stats.daysSinceFirst} días`,
      
      // Formato años, meses, días
      `${stats.yearsSinceFirst > 0 ? `${stats.yearsSinceFirst} años, ` : ''}${stats.monthsSinceFirst % 12 > 0 ? `${stats.monthsSinceFirst % 12} meses, ` : ''}${stats.daysSinceFirst % 30} días`,
      
      // Formato horas
      `${String(Math.floor(stats.hoursSinceFirst)).padStart(2, '0')}:${String(Math.floor(stats.minutesSinceFirst % 60)).padStart(2, '0')}:${String(Math.floor(stats.secondsSinceFirst % 60)).padStart(2, '0')}`
    ];
    
    return formats;
  };

  // Formatear fechas de ocurrencias
  const formatOccurrenceDates = () => {
    if (!eventOccurrences || eventOccurrences.length === 0) return ["Sin ocurrencias"];
    
    return eventOccurrences.map((event, index) => 
      `${index === 0 ? 'Primera' : `${index + 1}ª`}: ${format(event.startDate, 'dd/MM/yyyy')}`
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ 
        p: 3,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <Typography variant="h6" gutterBottom>
          Bienvenido a Chronicon
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            textAlign: 'center',
            maxWidth: '600px',
            mb: 3
          }}
        >
          Por favor inicia sesión con tu cuenta de Google para acceder a tu calendario Chronicon.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSignIn}
          disabled={loading || authLoading}
        >
          {authLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
        </Button>
        
        {authError && (
          <Alert 
            severity="error" 
            sx={{ mt: 2, maxWidth: '600px' }}
          >
            {authError}
          </Alert>
        )}
        
        {popupBlocked && (
          <Alert 
            severity="warning" 
            sx={{ mt: 2, maxWidth: '600px' }}
          >
            El navegador bloqueó la ventana emergente. Por favor, asegúrate de permitir ventanas emergentes para este sitio y vuelve a intentarlo.
          </Alert>
        )}
      </Box>
    );
  }

  if (!calendar) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>
          Por favor selecciona un calendario para ver los eventos.
        </Typography>
      </Box>
    );
  }

  if (!events.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>
          No hay eventos disponibles. Crea uno en la vista de Grid.
        </Typography>
      </Box>
    );
  }

  // Obtener nombres únicos de eventos para el selector
  const uniqueEventNames = Object.keys(eventsByName);

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Panel superior con selector y estadísticas */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {/* Selector de evento con botón de edición */}
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 2
            }}>
              <Select
                value={selectedEvent}
                onChange={handleEventChange}
                size="small"
                sx={{ 
                  minWidth: 200,
                  maxWidth: 'fit-content',
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                  }
                }}
                startAdornment={<CalendarMonth sx={{ mr: 1, opacity: 0.7 }} />}
              >
                {uniqueEventNames.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
              
              {selectedEventObject && (
                <Tooltip title="Editar evento">
                  <IconButton 
                    color="primary" 
                    onClick={handleEditClick}
                    size="small"
                  >
                    <Edit />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Grid>
          
          {/* Estadísticas */}
          <Grid item xs={12}>
            {eventStats ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {/* Chip de ocurrencias */}
                <StatChip 
                  title="Ocurrencias:"
                  values={formatOccurrenceDates()}
                  icon={<Repeat />}
                />
                
                {/* Chip de tiempo transcurrido */}
                <StatChip 
                  title="Tiempo desde la primera ocurrencia:"
                  values={formatTimeElapsed(eventStats)}
                  icon={<AccessTime />}
                />
                
                {/* Chip de última ocurrencia (si hay más de una) */}
                {eventStats.totalOccurrences > 1 && (
                  <StatChip 
                    title="Última vez:"
                    values={[
                      `Hace ${eventStats.daysSinceLast} días`,
                      format(eventStats.lastDate, 'dd/MM/yyyy')
                    ]}
                    icon={<Update />}
                  />
                )}
                
                {/* Chip de promedio (si hay más de una ocurrencia) */}
                {eventStats.totalOccurrences > 1 && eventStats.averageGapDays && (
                  <StatChip 
                    title="Promedio entre ocurrencias:"
                    values={[
                      `${eventStats.averageGapDays} días`
                    ]}
                    icon={<Repeat />}
                  />
                )}
                
                {/* Chip de etiquetas (si hay) */}
                {eventStats.tags && eventStats.tags.length > 0 && (
                  <StatChip 
                    title="Etiquetas:"
                    values={[eventStats.tags.join(', ')]}
                    icon={<LocalOffer />}
                  />
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Selecciona un evento para ver sus estadísticas
              </Typography>
            )}
          </Grid>
          
          {/* Control deslizante para ajustar el tamaño */}
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mt: 1,
              px: 2
            }}>
              <ZoomOut fontSize="small" />
              <Slider
                value={calendarSize}
                onChange={handleSizeChange}
                aria-labelledby="calendar-size-slider"
                valueLabelDisplay="auto"
                step={5}
                min={10}
                max={100}
                sx={{ 
                  mx: 2,
                  '& .MuiSlider-thumb': {
                    width: 14,
                    height: 14,
                  },
                  '& .MuiSlider-track': {
                    height: 4,
                  },
                  '& .MuiSlider-rail': {
                    height: 4,
                  }
                }}
              />
              <ZoomIn fontSize="small" />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Calendario personalizado */}
      {eventStats && eventOccurrences.length > 0 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          {Object.entries(calendarMonths).map(([year, months]) => (
            <Box key={year}>
              <YearSeparator year={year} />
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                justifyContent: 'flex-start'
              }}>
                {months.map(month => (
                  <MonthCalendar 
                    key={month.toString()}
                    month={month}
                    highlightedDates={highlightedDates}
                    eventColor={selectedEventObject?.color}
                    monthsPerRow={monthsPerRow}
                    size={calendarSize}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Paper>
      )}
      
      {/* Formulario de edición */}
      {selectedEventObject && (
        <EventForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleUpdateEvent}
          event={selectedEventObject}
        />
      )}
      
      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EventCalendar;
