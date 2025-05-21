import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"; // No longer used
import { 
  Select, 
  MenuItem, 
  Box, 
  Typography, 
  Paper, 
  Divider,
  CircularProgress,
  // Badge, // No longer used
  Chip,
  IconButton,
  Tooltip,
  // Zoom, // No longer used
  Grid,
  useTheme,
  Snackbar,
  Alert,
  // Stack, // No longer used
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Fade // Added Fade
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { 
  Edit, 
  CalendarMonth, 
  AccessTime, 
  Repeat, 
  LocalOffer, 
  Update, 
  // KeyboardArrowDown, // No longer used
  ViewStream, 
  ViewModule, 
} from "@mui/icons-material";
import { format, differenceInDays, differenceInMonths, differenceInYears, differenceInSeconds, differenceInHours, differenceInMinutes, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getMonth, getYear, isSameDay, startOfDay, endOfDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { GlobalContext } from "../context/GlobalContext";
import { groupEventsByName, createEventObject } from "../services/eventService";
import { updateEvent as updateGoogleEvent, signIn } from "../services/googleService";
import EventForm from "./EventForm";

// Componente para mostrar estadísticas en chips interactivos
const StatChip = ({ title, values, icon }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const theme = useTheme();
  const valueArray = Array.isArray(values) ? values : [values];
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
    <Box sx={{ position: 'relative', mb: 1.5, mr: 1.5, display: 'inline-block', minWidth: '180px' }}>
      <Paper
        elevation={1}
        onClick={handleClick}
        sx={{
          borderRadius: '12px',
          transition: 'all 0.15s ease-in-out',
          transform: animating ? 'translateY(-2px)' : 'translateY(0)',
          opacity: animating ? 0.9 : 1,
          '&:hover': { boxShadow: isInteractive ? 2 : 1, cursor: isInteractive ? 'pointer' : 'default' },
          position: 'relative', zIndex: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ p: 1, pl: 1.5, pr: 1.5, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
          {icon && <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{React.cloneElement(icon, { fontSize: 'small', sx: { color: theme.palette.text.secondary }})}</Box>}
          <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>{title}</Typography>
        </Box>
        <Box sx={{ p: 1, pl: 1.5, pr: 1.5, minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ textAlign: 'center', color: theme.palette.text.primary }}>{valueArray[currentIndex]}</Typography>
        </Box>
      </Paper>
      {isInteractive && (
        <>
          <Box sx={{ position: 'absolute', bottom: -3, left: 3, right: -3, width: '100%', height: '100%', borderRadius: '12px', backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, zIndex: 1 }} />
          {valueArray.length > 2 && <Box sx={{ position: 'absolute', bottom: -6, left: 6, right: -6, width: '100%', height: '100%', borderRadius: '12px', backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, zIndex: 0 }} />}
        </>
      )}
    </Box>
  );
};

// Componente para mostrar un día en el calendario
const CalendarDay = React.memo(({ day, eventIndex, inRange, isOutside, eventColorToUse, theme, daySize }) => {
  const hasEvent = eventIndex !== -1;
  const isFirstOccurrence = eventIndex === 0;
  const isToday = isSameDay(day, new Date());
  
  const todayColors = { light: { background: '#e3f2fd', border: '#2196f3' }, dark: { background: '#1a237e', border: '#3f51b5' } };
  const outsideColors = { light: { background: '#f5f5f5', border: '#e0e0e0' }, dark: { background: '#424242', border: '#616161' } };
  
  return (
    <Box 
      sx={{
        width: `${daySize}px`, height: `${daySize}px`,
        backgroundColor: isToday ? (theme.palette.mode === 'dark' ? todayColors.dark.background : todayColors.light.background)
          : isOutside ? (theme.palette.mode === 'dark' ? outsideColors.dark.background : outsideColors.light.background)
          : hasEvent ? (isFirstOccurrence ? eventColorToUse : (theme.palette.mode === 'dark' ? alpha(eventColorToUse, 0.7) : alpha(eventColorToUse, 0.5)))
          : inRange ? (theme.palette.mode === 'dark' ? alpha(eventColorToUse, 0.15) : alpha(eventColorToUse, 0.1))
          : 'transparent',
        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', m: 0.2,
        border: isToday ? `2px solid ${theme.palette.mode === 'dark' ? todayColors.dark.border : todayColors.light.border}`
          : isOutside ? `1px solid ${theme.palette.mode === 'dark' ? outsideColors.dark.border : outsideColors.light.border}`
          : hasEvent ? `1px solid ${eventColorToUse}`
          : inRange ? `1px solid ${alpha(eventColorToUse, 0.3)}`
          : `1px solid ${theme.palette.divider}`,
        boxShadow: isToday ? `0 0 5px ${alpha(theme.palette.mode === 'dark' ? todayColors.dark.border : todayColors.light.border, 0.5)}` : 'none',
      }}
    >
      {hasEvent && ( // Day number is rendered only if hasEvent is true
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: `${daySize / 2.5}px`,
            color: isToday ? (theme.palette.mode === 'dark' ? alpha(todayColors.dark.border, 0.9) : alpha(todayColors.light.border, 0.9))
                  : theme.palette.getContrastText(isFirstOccurrence ? eventColorToUse : (theme.palette.mode === 'dark' ? alpha(eventColorToUse, 0.7) : alpha(eventColorToUse, 0.5))),
            fontWeight: 'bold', // Always bold if it has an event
          }}
        >
          {format(day, 'd')}
        </Typography>
      )}
      {hasEvent && (
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: `${daySize / 4}px`, height: `${daySize / 4}px`, borderRadius: '50%', backgroundColor: isFirstOccurrence ? (theme.palette.mode === 'dark' ? '#fff' : '#000') : (theme.palette.mode === 'dark' ? alpha('#fff', 0.7) : alpha('#000', 0.7)), opacity: isFirstOccurrence ? 1 : 0.7, transform: 'translate(25%, -25%)' }}/>
      )}
    </Box>
  );
});

// Componente para mostrar un mes en el calendario personalizado
const MonthCalendar = React.memo(({ month, highlightedDates, eventColor, monthsPerRow, size, calendarColors, firstDayOfWeekValue }) => {
  const theme = useTheme();
  const defaultColor = theme.palette.mode === 'dark' ? '#1976d2' : '#2196f3';
  
  const getEventColor = useCallback(() => {
    if (!eventColor) return defaultColor;
    if (calendarColors && calendarColors[eventColor]) return calendarColors[eventColor].background;
    return eventColor;
  }, [eventColor, calendarColors, defaultColor]);
  
  const eventColorToUse = useMemo(() => getEventColor(), [getEventColor]);
  
  const actualFirstOfMonth = startOfMonth(month);
  const daysInMonthArray = useMemo(() => eachDayOfInterval({ start: actualFirstOfMonth, end: endOfMonth(month) }), [actualFirstOfMonth, month]);
  
  const monthGridDays = useMemo(() => {
    const grid = [];
    const dayOfWeekForFirst = getDay(actualFirstOfMonth);
    const spacerCellsCount = (dayOfWeekForFirst - firstDayOfWeekValue + 7) % 7;

    for (let i = 0; i < spacerCellsCount; i++) {
      grid.push(<Box key={`spacer-${i}`} sx={{ width: size, height: size, m: 0.2, border: '1px solid transparent' }} />);
    }

    daysInMonthArray.forEach(day => {
      const eventIndex = highlightedDates.findIndex(d => isSameDay(d, day));
      const inRange = highlightedDates.length > 0 && day >= highlightedDates[0] && day <= new Date();
      const isOutside = highlightedDates.length === 0 || day < startOfDay(highlightedDates[0]) || day > endOfDay(new Date());
      
      grid.push(
        <CalendarDay 
          key={day.toString()} day={day} eventIndex={eventIndex} inRange={inRange} isOutside={isOutside}
          eventColorToUse={eventColorToUse} theme={theme} daySize={size}
        />
      );
    });
    return grid;
  }, [actualFirstOfMonth, daysInMonthArray, firstDayOfWeekValue, highlightedDates, eventColorToUse, theme, size]);

  const monthName = useMemo(() => format(month, 'MMMM', { locale: es }), [month]);
  
  return (
    <Box sx={{ p: 0.75, width: `${100 / monthsPerRow}%`, minWidth: '180px', boxSizing: 'border-box' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500, textAlign: 'center', color: theme.palette.text.secondary }}>
        {monthName}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, justifyItems: 'center', alignItems: 'center', mx: 'auto', width: 'fit-content' }}>
        {monthGridDays}
      </Box>
    </Box>
  );
});

const YearSeparator = React.memo(({ year }) => {
  const theme = useTheme();
  return (
    <Box sx={{ position: 'relative', my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Divider sx={{ width: '100%' }} />
      <Typography variant="h6" component="span" sx={{ position: 'absolute', backgroundColor: theme.palette.background.paper, px: 2, fontWeight: 'bold', color: theme.palette.text.primary }}>
        {year}
      </Typography>
    </Box>
  );
});

function EventCalendar() {
  const location = useLocation();
  const { 
    events, loading, error, updateEvent: updateEventInState,
    calendar, user, setUser, setCalendar, calendarColors, config 
  } = useContext(GlobalContext);
  
  const [selectedEvent, setSelectedEvent] = useState("");
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [eventOccurrences, setEventOccurrences] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEventObject, setSelectedEventObject] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState("traditional"); 
  const theme = useTheme();

  const eventsByName = useMemo(() => groupEventsByName(events), [events]);

  useEffect(() => {
    if (location.state?.selectedEvent) setSelectedEvent(location.state.selectedEvent);
    else if (Object.keys(eventsByName).length > 0 && !selectedEvent) setSelectedEvent(Object.keys(eventsByName)[0]);
  }, [location.state, eventsByName, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || !events.length) return;
    const occurrences = eventsByName[selectedEvent] || [];
    setEventOccurrences(occurrences);
    if (occurrences.length > 0) {
      const dates = occurrences.map(event => event.startDate);
      setHighlightedDates(dates);
      const firstOccurrence = occurrences[0];
      const lastOccurrence = occurrences[occurrences.length - 1];
      const today = new Date();
      const stats = {
        firstDate: firstOccurrence.startDate, lastDate: lastOccurrence.startDate, totalOccurrences: occurrences.length,
        daysSinceFirst: differenceInDays(today, firstOccurrence.startDate), monthsSinceFirst: differenceInMonths(today, firstOccurrence.startDate),
        yearsSinceFirst: differenceInYears(today, firstOccurrence.startDate), daysSinceLast: differenceInDays(today, lastOccurrence.startDate),
        secondsSinceFirst: differenceInSeconds(today, firstOccurrence.startDate), minutesSinceFirst: differenceInMinutes(today, firstOccurrence.startDate),
        hoursSinceFirst: differenceInHours(today, firstOccurrence.startDate), tags: firstOccurrence.tags || [], colorId: firstOccurrence.colorId || null,
      };
      if (occurrences.length > 1) {
        let totalGapDays = 0;
        for (let i = 1; i < occurrences.length; i++) totalGapDays += differenceInDays(occurrences[i].startDate, occurrences[i - 1].startDate);
        stats.averageGapDays = Math.round(totalGapDays / (occurrences.length - 1));
      }
      setEventStats(stats); setSelectedEventObject(firstOccurrence);
    } else {
      setHighlightedDates([]); setEventStats(null); setSelectedEventObject(null);
    }
  }, [selectedEvent, events, eventsByName]);

  const calendarMonths = useMemo(() => {
    if (!highlightedDates.length) return { years: [], monthsByYear: {} };
    const firstDate = highlightedDates[0]; const today = new Date();
    const months = []; let currentMonth = startOfMonth(firstDate);
    while (currentMonth <= today) { months.push(currentMonth); currentMonth = addMonths(currentMonth, 1); }
    const yearMonths = {};
    months.forEach(month => {
      const year = getYear(month);
      if (!yearMonths[year]) yearMonths[year] = [];
      yearMonths[year].push(month);
    });
    const sortedYears = Object.keys(yearMonths).map(Number).sort((a, b) => a - b);
    const orderedYearMonths = {};
    sortedYears.forEach(year => {
      orderedYearMonths[year] = yearMonths[year].sort((a, b) => getMonth(a) - getMonth(b));
    });
    return { years: sortedYears, monthsByYear: orderedYearMonths };
  }, [highlightedDates]); 

  // Data Preparation for Stream View
  const streamDays = useMemo(() => {
    if (!eventStats || highlightedDates.length === 0) {
      return [];
    }
    const firstEventDate = eventStats.firstDate;
    const today = startOfDay(new Date());
    if (firstEventDate > today) return []; // Handle case where first event is in the future

    const daysArray = eachDayOfInterval({ start: firstEventDate, end: today });
    return daysArray.sort((a, b) => b - a); // Sort in descending chronological order
  }, [highlightedDates, eventStats]);
  
  useEffect(() => {
    const handlePopupBlocked = (event) => {
      setPopupBlocked(true);
      setAuthError(event.detail.message || "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio.");
    };
    window.addEventListener('auth-popup-blocked', handlePopupBlocked);
    return () => window.removeEventListener('auth-popup-blocked', handlePopupBlocked);
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true); setAuthError(null); setPopupBlocked(false);
      const response = await signIn((message, isError) => setAuthError(isError ? `Error: ${message}` : `Status: ${message}`));
      if (response?.userProfile) { setUser(response.userProfile); setCalendar(response.calendar); }
    } catch (error) {
      if (error?.error !== "popup_closed_by_user") {
        setAuthError(error.message || "Error al iniciar sesión. Por favor, intenta de nuevo.");
        if (error.type === 'popup_failed_to_open' || error.type === 'popup_closed') setPopupBlocked(true);
      }
    } finally { setAuthLoading(false); }
  };

  const handleEventChange = (event) => setSelectedEvent(event.target.value);
  const handleEditClick = () => setFormOpen(true);

  const handleUpdateEvent = async (formData) => {
    if (!calendar?.id || !selectedEventObject?.id) {
      setSnackbar({ open: true, message: "Error: Falta información del calendario o evento", severity: "error" }); return;
    }
    try {
      setProcessing(true);
      const eventObject = createEventObject({
        id: selectedEventObject.id, name: formData.name || selectedEventObject.name, startDate: formData.startDate || selectedEventObject.startDate,
        description: formData.description !== undefined ? formData.description : selectedEventObject.description,
        colorId: formData.colorId || selectedEventObject.colorId, tags: formData.tags || selectedEventObject.tags,
      });
      const updatedEvent = await updateGoogleEvent(calendar.id, selectedEventObject.id, eventObject);
      if (updatedEvent) {
        updateEventInState(updatedEvent); setFormOpen(false);
        if (formData.name && formData.name !== selectedEvent) setSelectedEvent(formData.name);
        setSnackbar({ open: true, message: "Evento actualizado correctamente", severity: "success" });
      } else throw new Error("Failed to update event");
    } catch (error) {
      setSnackbar({ open: true, message: `Error al actualizar el evento: ${error.message || "Error desconocido"}`, severity: "error" });
    } finally { setProcessing(false); }
  };

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const formatTimeElapsed = (stats) => {
    if (!stats) return [];
    return [
      `${stats.daysSinceFirst} días`,
      `${stats.yearsSinceFirst > 0 ? `${stats.yearsSinceFirst} años, ` : ''}${stats.monthsSinceFirst % 12 > 0 ? `${stats.monthsSinceFirst % 12} meses, ` : ''}${stats.daysSinceFirst % 30} días`,
      `${String(Math.floor(stats.hoursSinceFirst)).padStart(2, '0')}:${String(Math.floor(stats.minutesSinceFirst % 60)).padStart(2, '0')}:${String(Math.floor(stats.secondsSinceFirst % 60)).padStart(2, '0')}`
    ];
  };

  const formatOccurrenceDates = () => {
    if (!eventOccurrences || eventOccurrences.length === 0) return ["Sin ocurrencias"];
    return eventOccurrences.map((event, index) => `${index === 0 ? 'Primera' : `${index + 1}ª`}: ${format(event.startDate, 'dd/MM/yyyy')}`);
  };

  const handleViewModeChange = (event, newMode) => { if (newMode !== null) setCalendarViewMode(newMode); };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;
  if (!user) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" gutterBottom>Bienvenido a Chronicon</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px', mb: 3 }}>Por favor inicia sesión con tu cuenta de Google para acceder a tu calendario Chronicon.</Typography>
        <Button variant="contained" color="primary" onClick={handleSignIn} disabled={loading || authLoading}>{authLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}</Button>
        {authError && <Alert severity={authError.startsWith("Error:") ? "error" : "info"} sx={{ mt: 2, maxWidth: '600px' }}>{authError.startsWith("Error:") ? authError.substring(7) : authError.startsWith("Status:") ? authError.substring(8) : authError}</Alert>}
        {popupBlocked && <Alert severity="warning" sx={{ mt: 2, maxWidth: '600px' }}>El navegador bloqueó la ventana emergente. Por favor, asegúrate de permitir ventanas emergentes para este sitio y vuelve a intentarlo.</Alert>}
      </Box>
    );
  }
  if (!calendar) return <Box sx={{ p: 3 }}><Typography>Por favor selecciona un calendario para ver los eventos.</Typography></Box>;
  if (!events.length) return <Box sx={{ p: 3 }}><Typography>No hay eventos disponibles. Crea uno en la vista de Grid.</Typography></Box>;

  const uniqueEventNames = Object.keys(eventsByName);
  const hardcodedMonthsPerRow = 3; 
  const hardcodedDaySize = 30; 

  let firstDayOfWeekValue = 0; 
  if (config.firstDayOfWeek === "monday") firstDayOfWeekValue = 1;
  else if (config.firstDayOfWeek === "saturday") firstDayOfWeekValue = 6;

  const defaultEventColor = theme.palette.mode === 'dark' ? '#1976d2' : '#2196f3';
  const streamEventColorToUse = useMemo(() => {
    if (!eventStats?.colorId) return defaultEventColor;
    if (calendarColors && calendarColors[eventStats.colorId]) {
      return calendarColors[eventStats.colorId].background;
    }
    return eventStats.colorId; 
  }, [eventStats, calendarColors, defaultEventColor, theme.palette.mode]);


  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Select value={selectedEvent} onChange={handleEventChange} size="small" sx={{ minWidth: 200, maxWidth: 'fit-content', '& .MuiSelect-select': { display: 'flex', alignItems: 'center' }}} startAdornment={<CalendarMonth sx={{ mr: 1, opacity: 0.7 }} />}>
                {uniqueEventNames.map((name) => (<MenuItem key={name} value={name}>{name}</MenuItem>))}
              </Select>
              {selectedEventObject && <Tooltip title="Editar evento"><IconButton color="primary" onClick={handleEditClick} size="small"><Edit /></IconButton></Tooltip>}
            </Box>
          </Grid>
          <Grid item xs={12}>
            {eventStats ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <StatChip title="Ocurrencias:" values={formatOccurrenceDates()} icon={<Repeat />} />
                <StatChip title="Tiempo desde la primera ocurrencia:" values={formatTimeElapsed(eventStats)} icon={<AccessTime />} />
                {eventStats.totalOccurrences > 1 && <StatChip title="Última vez:" values={[`Hace ${eventStats.daysSinceLast} días`, format(eventStats.lastDate, 'dd/MM/yyyy')]} icon={<Update />} />}
                {eventStats.totalOccurrences > 1 && eventStats.averageGapDays && <StatChip title="Promedio entre ocurrencias:" values={[`${eventStats.averageGapDays} días`]} icon={<Repeat />} />}
                {eventStats.tags && eventStats.tags.length > 0 && <StatChip title="Etiquetas:" values={[eventStats.tags.join(', ')]} icon={<LocalOffer />} />}
              </Box>
            ) : <Typography variant="body2" color="text.secondary">Selecciona un evento para ver sus estadísticas</Typography>}
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, px: 1, flexWrap: 'wrap', gap: 2 }}>
              <ToggleButtonGroup value={calendarViewMode} exclusive onChange={handleViewModeChange} aria-label="calendar view mode" size="small">
                <ToggleButton value="traditional" aria-label="traditional view"><ViewModule sx={{ mr: 0.5 }} fontSize="small" />Tradicional</ToggleButton>
                <ToggleButton value="stream" aria-label="stream view"><ViewStream sx={{ mr: 0.5 }} fontSize="small" />Stream</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Container for Fade transitions - can be a simple Box or React.Fragment if no specific styling is needed */}
      <Box sx={{ position: 'relative' }}>
        <Fade in={calendarViewMode === "traditional"} timeout={500} mountOnEnter unmountOnExit>
          <Paper elevation={3} sx={{ p: 2, display: calendarViewMode === "traditional" ? 'block' : 'none' }}>
            {eventStats && eventOccurrences.length > 0 ? (
              calendarMonths.years.map(year => (
                <Box key={year}>
                  <YearSeparator year={year} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {calendarMonths.monthsByYear[year].map(month => (
                      <MonthCalendar 
                        key={month.toString()} month={month} highlightedDates={highlightedDates}
                        eventColor={eventStats.colorId} monthsPerRow={hardcodedMonthsPerRow}
                        size={hardcodedDaySize} calendarColors={calendarColors}
                        firstDayOfWeekValue={firstDayOfWeekValue}
                      />
                    ))}
                  </Box>
                </Box>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', p:2 }}>No hay datos para mostrar en la vista tradicional.</Typography>
            )}
          </Paper>
        </Fade>

        <Fade in={calendarViewMode === "stream"} timeout={500} mountOnEnter unmountOnExit>
          <Paper elevation={3} sx={{ p: 2, display: calendarViewMode === "stream" ? 'block' : 'none' }}>
            {eventStats && streamDays.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', p: 1 }}>
                {streamDays.map(day => {
                  const eventIndex = highlightedDates.findIndex(d => isSameDay(d, day));
                  return (
                    <CalendarDay 
                      key={day.toISOString()}
                      day={day}
                      eventIndex={eventIndex}
                      inRange={true} 
                      isOutside={false} 
                      eventColorToUse={streamEventColorToUse}
                      theme={theme}
                      daySize={hardcodedDaySize}
                    />
                  );
                })}
              </Box>
            ) : (
               <Typography sx={{ textAlign: 'center', p:2 }}>No hay datos para mostrar en la vista de stream.</Typography>
            )}
          </Paper>
        </Fade>
      </Box>
      
      {selectedEventObject && <EventForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleUpdateEvent} event={selectedEventObject} />}
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default EventCalendar;
