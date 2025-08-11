import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { 
  Select, 
  MenuItem, 
  Box, 
  Typography, 
  Paper, 
  Divider,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  useTheme,
  Snackbar,
  Alert,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Slide,
  FormControlLabel,
  Switch
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { 
  Edit, 
  CalendarMonth, 
  AccessTime, 
  Repeat, 
  LocalOffer, 
  Update, 
  ViewStream, 
  ViewModule, 
  Repeat as RepeatIcon,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import { format, differenceInDays, differenceInMonths, differenceInYears, differenceInSeconds, differenceInHours, differenceInMinutes, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getMonth, getYear, isSameDay, startOfDay, endOfDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from 'react-i18next';
import { GlobalContext } from "../context/GlobalContext";
import { groupEventsByName, createEventObject, parseGoogleEvent } from "../services/eventService";
import EventForm from "./EventForm";
import AddRecurrenceDialog from "./AddRecurrenceDialog";
import logger from "../utils/logger.js";

/**
 * StatChip component
 */
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

/**
 * CalendarDay component
 */
const CalendarDay = React.memo(({ day, eventIndex, inRange, isOutside, eventColorToUse, theme, daySize, onDayClick, showAllDayNumbers }) => {
  const hasEvent = eventIndex !== -1;
  const isFirstOccurrence = eventIndex === 0;
  const isToday = isSameDay(day, new Date());
  
  const todayColors = { light: { background: '#e3f2fd', border: '#2196f3' }, dark: { background: '#1a237e', border: '#3f51b5' } };
  const outsideColors = { light: { background: '#f5f5f5', border: '#e0e0e0' }, dark: { background: '#424242', border: '#616161' } };
  
  const handleDayClick = () => {
    if (onDayClick) {
      onDayClick(day);
    }
  };

  let dayNumberColor;
  if (hasEvent || isToday) {
    if (isToday) {
      dayNumberColor = theme.palette.mode === 'dark' ? alpha(todayColors.dark.border, 0.9) : alpha(todayColors.light.border, 0.9);
    } else { // hasEvent but not today
      dayNumberColor = theme.palette.getContrastText(isFirstOccurrence ? eventColorToUse : (theme.palette.mode === 'dark' ? alpha(eventColorToUse, 0.7) : alpha(eventColorToUse, 0.5)));
    }
  } else { // Not an event day, not today - only shown if showAllDayNumbers is true
    dayNumberColor = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.3 : 0.4); 
  }

  return (
    <Box 
      onClick={handleDayClick}
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
        cursor: onDayClick ? 'pointer' : 'default',
        '&:hover': onDayClick ? { boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.6)}`, transform: 'scale(1.05)' } : {}
      }}
    >
      {(hasEvent || isToday || showAllDayNumbers) && (
        <Typography
          variant="caption"
          sx={{
            fontSize: `${daySize / 2.5}px`,
            color: dayNumberColor, // Use the calculated color
            fontWeight: (hasEvent || isToday) ? 'bold' : 'normal',
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

/**
 * MonthCalendar component
 */
const MonthCalendar = React.memo(({ month, highlightedDates, eventColor, size, calendarColors, onDayClick, showAllDayNumbers }) => {
  const theme = useTheme();
  const defaultColor = theme.palette.mode === 'dark' ? '#1976d2' : '#2196f3';
  
  const getEventColor = useCallback(() => {
    if (eventColor && calendarColors && calendarColors[eventColor]) {
      return calendarColors[eventColor].background;
    }
    return defaultColor;
  }, [eventColor, calendarColors, defaultColor]);
  
  const eventColorToUse = useMemo(() => getEventColor(), [getEventColor]);
  
  const firstDayOfWeekValue = 1; 
  const actualFirstOfMonth = startOfMonth(month);
  const daysInMonthArray = useMemo(() => eachDayOfInterval({ start: actualFirstOfMonth, end: endOfMonth(month) }), [actualFirstOfMonth]);
  
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
          onDayClick={onDayClick}
          showAllDayNumbers={showAllDayNumbers}
        />
      );
    });
    return grid;
  }, [actualFirstOfMonth, daysInMonthArray, highlightedDates, eventColorToUse, theme, size, onDayClick, showAllDayNumbers]);

  const monthName = useMemo(() => format(month, 'MMMM', { locale: es }), [month]);
  
  return (
    <Box sx={{ p: 0.75, width: { xs: '100%', sm: '50%', md: '33.33%', lg: '25%' }, minWidth: '180px', boxSizing: 'border-box' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500, textAlign: 'center', color: theme.palette.text.secondary }}>
        {monthName}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, justifyItems: 'center', alignItems: 'center', mx: 'auto', width: 'fit-content' }}>
        {monthGridDays}
      </Box>
    </Box>
  );
});

/**
 * YearSeparator component
 */
const YearSeparator = React.memo(({ year }) => { /* ... (unchanged) ... */ 
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

/**
 * EventCalendar component
 */
function EventCalendar() {
  const location = useLocation();
  const theme = useTheme();
  const defaultEventColor = theme.palette.mode === 'dark' ? '#1976d2' : '#2196f3';
  const { 
    events, appLoading, eventsLoading, processing, error, authError,
    calendar, user, handleSignIn, handleSignOut, handleCreateEvent, handleUpdateEvent, handleDeleteEvent, handleSaveRecurrence, calendarColors, config 
  } = useContext(GlobalContext);
  const { t } = useTranslation();
  
  const [selectedEvent, setSelectedEvent] = useState("");
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [eventOccurrences, setEventOccurrences] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEventObject, setSelectedEventObject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [calendarViewMode, setCalendarViewMode] = useState("traditional"); 

  const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false);
  const [eventForRecurrenceDialog, setEventForRecurrenceDialog] = useState(null);
  const [recurrenceDialogDate, setRecurrenceDialogDate] = useState(new Date());
  
  const [showAllDayNumbers, setShowAllDayNumbers] = useState(false);

  const [eventToEditFromStream, setEventToEditFromStream] = useState(null);

  const eventsByName = useMemo(() => groupEventsByName(events), [events]);

  useEffect(() => { 
    if (location.state?.selectedEventId) {
        const eventName = events.find(e => e.id === location.state.selectedEventId)?.name;
        if (eventName) setSelectedEvent(eventName);
    } else if (Object.keys(eventsByName).length > 0 && !selectedEvent) {
      setSelectedEvent(Object.keys(eventsByName)[0]);
    }
  }, [location.state, eventsByName, selectedEvent, events]);

  useEffect(() => { 
    if (!selectedEvent || !events.length) {
      setHighlightedDates([]); setEventStats(null); setSelectedEventObject(null); setEventOccurrences([]);
      return;
    }
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
    const firstDate = highlightedDates[0]; const today = new Date(); const months = []; 
    let currentMonth = startOfMonth(firstDate);
    while (currentMonth <= today) { months.push(currentMonth); currentMonth = addMonths(currentMonth, 1); }
    const yearMonths = {};
    months.forEach(month => {
      const year = getYear(month);
      if (!yearMonths[year]) yearMonths[year] = [];
      yearMonths[year].push(month);
    });
    const sortedYears = Object.keys(yearMonths).map(Number).sort((a, b) => a - b);
    const orderedYearMonths = {};
    sortedYears.forEach(year => orderedYearMonths[year] = yearMonths[year].sort((a, b) => getMonth(a) - getMonth(b)));
    return { years: sortedYears, monthsByYear: orderedYearMonths };
  }, [highlightedDates]);

  const streamDays = useMemo(() => { 
    if (!eventStats || highlightedDates.length === 0) return [];
    const firstEventDate = eventStats.firstDate; const today = startOfDay(new Date());
    if (firstEventDate > today) return []; 
    const daysArray = eachDayOfInterval({ start: firstEventDate, end: today });
    return daysArray.sort((a, b) => b - a);
  }, [highlightedDates, eventStats]);
  
  const streamEventColorToUse = useMemo(() => { 
    if (eventStats?.colorId && calendarColors && calendarColors[eventStats.colorId]) {
      return calendarColors[eventStats.colorId].background;
    }
    return defaultEventColor; 
  }, [eventStats, calendarColors, defaultEventColor]);

  useEffect(() => { 
    const handlePopupBlocked = (event) => {
      setSnackbar({ open: true, message: event.detail.message || "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio.", severity: "warning" });
    };
    window.addEventListener('auth-popup-blocked', handlePopupBlocked);
    return () => window.removeEventListener('auth-popup-blocked', handlePopupBlocked);
  }, []);

  const handleEventChange = (event) => setSelectedEvent(event.target.value);
  const handleEditClick = () => { 
    if (selectedEventObject) {
      setEventToEditFromStream(null); 
      setFormOpen(true);
    } else setSnackbar({ open: true, message: "No hay una ocurrencia de evento específica seleccionada para editar.", severity: "warning" });
  };

  const handleUpdateEventFromCalendar = async (formData) => { 
    const eventToUpdate = eventToEditFromStream || selectedEventObject;
    if (!calendar?.id || !eventToUpdate?.id) {
      setSnackbar({ open: true, message: "Error: Falta información del calendario o evento", severity: "error" }); return;
    }
    try {
      setProcessing(true);
      await handleUpdateEvent(eventToUpdate.id, formData);
      setFormOpen(false); setEventToEditFromStream(null);
      if (formData.name && formData.name !== selectedEvent) setSelectedEvent(formData.name);
      setSnackbar({ open: true, message: "Evento actualizado correctamente", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: `Error al actualizar el evento: ${error.message || "Error desconocido"}`, severity: "error" });
    } finally { setProcessing(false); }
  };

  const handleDeleteEventFromCalendarForm = async (eventIdToDelete) => { 
    const eventBeingDeleted = eventToEditFromStream || selectedEventObject;
    if (!calendar?.id || !eventIdToDelete) {
      setSnackbar({ open: true, message: "Error: Falta ID de calendario o evento para eliminar.", severity: "error" });
      return;
    }
    try {
      await handleDeleteEvent(eventIdToDelete);
      setSnackbar({ open: true, message: "Evento eliminado correctamente.", severity: "success" });
      if (eventBeingDeleted?.id === eventIdToDelete) {
        setSelectedEventObject(null); 
        setEventToEditFromStream(null);
        const remainingOccurrences = (eventsByName[selectedEvent] || []).filter(e => e.id !== eventIdToDelete);
        if (remainingOccurrences.length === 0) setSelectedEvent("");
      }
    } catch (error) {
      setSnackbar({ open: true, message: `Error al eliminar evento: ${error.message}`, severity: "error" });
    } finally {
      setProcessing(false);
      setFormOpen(false); 
    }
  };

  const handleStreamDayClick = useCallback((day) => { 
    const foundEvent = eventOccurrences.find(e => isSameDay(e.startDate, day));
    if (foundEvent) {
      setEventToEditFromStream(foundEvent); 
      setSelectedEventObject(foundEvent); 
      setFormOpen(true);
    } else {
      if (selectedEvent && eventsByName[selectedEvent] && eventsByName[selectedEvent].length > 0) {
        setEventForRecurrenceDialog(eventsByName[selectedEvent][0]); 
        setRecurrenceDialogDate(day);
        setIsRecurrenceDialogOpen(true);
      } else {
        setSnackbar({ open: true, message: "Selecciona una serie de eventos para añadir una recurrencia.", severity: "info" });
      }
    }
  }, [eventOccurrences, selectedEvent, eventsByName]);

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

  const handleOpenRecurrenceDialogFromButton = () => { 
    const baseEventForRecurrence = eventToEditFromStream || selectedEventObject;
    if (!baseEventForRecurrence) {
      setSnackbar({ open: true, message: "Por favor, selecciona un evento primero.", severity: "info" });
      return;
    }
    setEventForRecurrenceDialog(baseEventForRecurrence);
    setRecurrenceDialogDate(new Date());
    setIsRecurrenceDialogOpen(true);
  };
  const handleDayCellClick = useCallback((dateOfClickedCell) => { 
    const baseEventForRecurrence = eventToEditFromStream || selectedEventObject; 
    if (!baseEventForRecurrence && (!selectedEvent || !eventsByName[selectedEvent] || eventsByName[selectedEvent].length === 0) ) {
      setSnackbar({ open: true, message: "Por favor, selecciona un evento para añadir una recurrencia.", severity: "info" });
      return;
    }
    setEventForRecurrenceDialog(baseEventForRecurrence || eventsByName[selectedEvent][0]);
    setRecurrenceDialogDate(dateOfClickedCell);
    setIsRecurrenceDialogOpen(true);
  }, [selectedEventObject, eventToEditFromStream, selectedEvent, eventsByName]);
  const handleCloseRecurrenceDialog = () => { 
    setIsRecurrenceDialogOpen(false);
    setEventForRecurrenceDialog(null);
  };
  const handleSaveRecurrenceFromCalendar = async (originalEvent, newDate) => { 
    if (!calendar?.id) {
      setSnackbar({ open: true, message: "Error: ID de calendario no disponible.", severity: "error" });
      return;
    }
    if (!originalEvent) {
      setSnackbar({ open: true, message: "Error: Evento original no disponible.", severity: "error" });
      return;
    }
    setProcessing(true);
    try {
      await handleSaveRecurrence(originalEvent, newDate);
      setSnackbar({ open: true, message: "Recurrencia añadida correctamente.", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: `Error al añadir recurrencia: ${error.message}`, severity: "error" });
    } finally {
      setProcessing(false);
      handleCloseRecurrenceDialog();
    }
  };

  // Conditional Renders
  if (appLoading || eventsLoading || processing) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>;
  if (!user) { 
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" gutterBottom>{t('welcomeTitle')}</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px', mb: 3 }}>{t('welcomeMessage')}</Typography>
        <Button variant="contained" color="primary" onClick={handleSignIn} disabled={authLoading}>{authLoading ? t('signingIn') : t('signInWithGoogle')}</Button>
        {authError && <Alert severity={authError.startsWith("Error:") ? "error" : "info"} sx={{ mt: 2, maxWidth: '600px' }}>{authError.startsWith("Error:") ? authError.substring(7) : authError.startsWith("Status:") ? authError.substring(8) : authError}</Alert>}
        {popupBlocked && <Alert severity="warning" sx={{ mt: 2, maxWidth: '600px' }}>{t('popupBlockedMessage')}</Alert>}
      </Box>
    );
  }
  if (!calendar) return <Box sx={{ p: 3 }}><Typography>{t('selectCalendarMessage')}</Typography></Box>;
  if (!events.length && !eventsLoading) return <Box sx={{ p: 3 }}><Typography>{t('noEventsMessage')}</Typography></Box>;

  const uniqueEventNames = Object.keys(eventsByName);
  const hardcodedDaySize = 24; 
  const eventForForm = eventToEditFromStream || selectedEventObject;


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Select value={selectedEvent} onChange={handleEventChange} size="small" sx={{ minWidth: 200, maxWidth: 'fit-content', '& .MuiSelect-select': { display: 'flex', alignItems: 'center' }}} startAdornment={<CalendarMonth sx={{ mr: 1, opacity: 0.7 }} />}>
                  {uniqueEventNames.map((name) => (<MenuItem key={name} value={name}>{name}</MenuItem>))}
                </Select>
                {selectedEventObject && ( 
                  <>
                    <Tooltip title="Editar primera ocurrencia"><IconButton color="primary" onClick={handleEditClick} size="small"><Edit /></IconButton></Tooltip>
                    <Tooltip title="Añadir Ocurrencia">
                      <IconButton 
                        color="primary"
                        onClick={handleOpenRecurrenceDialogFromButton}
                        disabled={!selectedEventObject || processing}
                        size="small"
                      >
                        <RepeatIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
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
              ) : <Typography variant="body2" color="text.secondary">Selecciona un evento para ver sus estadísticas.</Typography>}
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <ToggleButtonGroup value={calendarViewMode} exclusive onChange={handleViewModeChange} aria-label="calendar view mode" size="small">
                <ToggleButton value="traditional" aria-label="traditional view"><ViewModule sx={{ mr: 0.5 }} fontSize="small" />Tradicional</ToggleButton>
                <ToggleButton value="stream" aria-label="stream view"><ViewStream sx={{ mr: 0.5 }} fontSize="small" />Stream</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Mostrar/Ocultar números de todos los días">
                <IconButton 
                  onClick={() => setShowAllDayNumbers(!showAllDayNumbers)} 
                  color="primary"
                  sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}
                >
                  {showAllDayNumbers ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ position: 'relative' }}>
          <Slide direction="down" in={calendarViewMode === "traditional"} timeout={500} mountOnEnter unmountOnExit>
            <Paper elevation={3} sx={{ p: 2, display: calendarViewMode === "traditional" ? 'block' : 'none' }}>
              {eventStats && eventOccurrences.length > 0 ? (
                calendarMonths.years.map(year => (
                  <Box key={year}>
                    <YearSeparator year={year} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                      {calendarMonths.monthsByYear[year].map(month => (
                        <MonthCalendar 
                          key={month.toString()} month={month} highlightedDates={highlightedDates}
                          eventColor={eventStats.colorId}
                          size={hardcodedDaySize} calendarColors={calendarColors}
                          onDayClick={handleDayCellClick}
                          showAllDayNumbers={showAllDayNumbers}
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              ) : ( <Typography sx={{ textAlign: 'center', p:2 }}>No hay datos para mostrar en la vista tradicional.</Typography> )}
            </Paper>
          </Slide>

          <Slide direction="up" in={calendarViewMode === "stream"} timeout={500} mountOnEnter unmountOnExit>
            <Paper elevation={3} sx={{ p: 2, display: calendarViewMode === "stream" ? 'block' : 'none' }}>
              {eventStats && streamDays.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', p: 1 }}>
                  {streamDays.map(day => {
                    const eventIndex = highlightedDates.findIndex(d => isSameDay(d, day));
                    return (
                      <CalendarDay 
                        key={day.toISOString()} day={day} eventIndex={eventIndex} inRange={true} isOutside={false}
                        eventColorToUse={streamEventColorToUse} theme={theme} daySize={hardcodedDaySize}
                        onDayClick={handleStreamDayClick}
                        showAllDayNumbers={showAllDayNumbers}
                      />
                    );
                  })}
                </Box>
              ) : ( <Typography sx={{ textAlign: 'center', p:2 }}>No hay datos para mostrar en la vista de stream.</Typography> )}
            </Paper>
          </Slide>
        </Box>
        
        {(formOpen && eventForForm) && (
          <EventForm 
            open={formOpen} 
            onClose={() => { 
              setFormOpen(false); 
              setEventToEditFromStream(null); 
            }} 
            onSubmit={handleUpdateEventFromCalendar} 
            event={eventForForm} 
            onDelete={handleDeleteEventFromCalendarForm}
          />
        )}
        
        <AddRecurrenceDialog
          open={isRecurrenceDialogOpen}
          onClose={handleCloseRecurrenceDialog}
          onSubmit={handleSaveRecurrenceFromCalendar}
          eventToRecur={eventForRecurrenceDialog}
          initialDate={recurrenceDialogDate}
        />

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}

export default EventCalendar;