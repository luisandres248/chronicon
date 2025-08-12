import React, { useContext, useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { GlobalContext } from "../context/GlobalContext";
import { fetchCalendarEvents, createEvent } from "../services/googleService";
import { parseGoogleEvent, groupEventsByName } from "../services/eventService";
import ImportEventCard from "../components/ImportEventCard";
import Logo from "../components/Logo"; // Import Logo component
import { useTranslation } from "react-i18next"; // Import useTranslation

const ImportEventsPage = () => {
  const { user, calendar, appLoading, authLoading, error, handleSignIn, events: chroniconEvents, reloadEvents } = useContext(GlobalContext); // Destructure reloadEvents
  const { t } = useTranslation(); // Initialize useTranslation
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [sourceEvents, setSourceEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState({});
  const [selectedGroupNames, setSelectedGroupNames] = useState(new Set());
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  useEffect(() => {
    const loadCalendars = async () => {
      if (user && window.gapi?.client?.calendar) {
        setLoadingCalendars(true);
        try {
          const response = await window.gapi.client.calendar.calendarList.list();
          const filteredCalendars = response.result.items.filter(c => c.id !== calendar?.id);
          setCalendars(filteredCalendars);
        } catch (err) {
          setImportError("Error loading calendars: " + (err.message || String(err)));
        } finally {
          setLoadingCalendars(false);
        }
      }
    };
    loadCalendars();
  }, [user, calendar?.id]);

  useEffect(() => {
    const loadEvents = async () => {
      if (selectedCalendarId && user) {
        setLoadingEvents(true);
        setSourceEvents([]);
        setGroupedEvents({});
        setSelectedGroupNames(new Set());
        setImportError(null);
        setImportSuccess(null);
        try {
          const googleEvents = await fetchCalendarEvents(selectedCalendarId, false);
          const parsedEvents = googleEvents.map(parseGoogleEvent).filter(Boolean);
          const grouped = groupEventsByName(parsedEvents);
          setSourceEvents(googleEvents);
          setGroupedEvents(grouped);
        } catch (err) {
          setImportError("Error loading events: " + (err.message || String(err)));
        } finally {
          setLoadingEvents(false);
        }
      }
    };
    loadEvents();
  }, [selectedCalendarId, user]);

  const eventGroupsForDisplay = useMemo(() => {
    return Object.values(groupedEvents);
  }, [groupedEvents]);

  const handleToggleSelectAll = (event) => {
    if (event.target.checked) {
      const allGroupNames = new Set(eventGroupsForDisplay.map((group) => group[0].name));
      setSelectedGroupNames(allGroupNames);
    } else {
      setSelectedGroupNames(new Set());
    }
  };

  const handleToggleSelectGroup = (groupName) => {
    setSelectedGroupNames((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(groupName)) {
        newSelected.delete(groupName);
      } else {
        newSelected.add(groupName);
      }
      return newSelected;
    });
  };

  const handleImportEvents = async () => {
    if (!calendar?.id) {
      setImportError(t('chroniconCalendarNotFound'));
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    let importedCount = 0;
    let skippedCount = 0;

    const existingChroniconEventNames = new Set(chroniconEvents.map(e => e.name));

    for (const groupName of selectedGroupNames) {
      const eventsInGroup = groupedEvents[groupName];
      if (!eventsInGroup || eventsInGroup.length === 0) continue;

      if (existingChroniconEventNames.has(groupName)) {
        skippedCount += eventsInGroup.length;
        continue;
      }

      for (const eventToImport of eventsInGroup) {
        const rawEventToImport = sourceEvents.find(e => e.id === eventToImport.id);
        if (!rawEventToImport) continue;

        const { id, ...eventData } = rawEventToImport;

        try {
          await createEvent(calendar.id, eventData);
          importedCount++;
        } catch (err) {
          console.error(`Failed to import event: ${eventToImport.name} (ID: ${eventToImport.id})`, err);
          setImportError(t('importErrorOccurred', { eventName: eventToImport.name }));
        }
      }
    }

    let successMessage = t('successfullyImportedEvents', { count: importedCount });
    if (skippedCount > 0) {
      successMessage += ` ${t('skippedExistingEvents', { count: skippedCount })}`;
    }
    setImportSuccess(successMessage);
    setSelectedGroupNames(new Set());
    setImporting(false);
    reloadEvents(); // Reload events in GlobalContext after import
  };

  if (appLoading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button variant="outlined" color="primary" onClick={handleSignIn} sx={{ mt: 2 }}>Sign In & Try Again</Button>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" gutterBottom>Welcome to Chronicon</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px', mb: 3 }}>
          Please sign in with Google to use this feature.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleSignIn} disabled={authLoading}>
          {authLoading ? "Signing in..." : "Sign in with Google"}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {importing && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      )}
      <Box sx={{ width: 400, margin: '0 auto', mb: 4 }}>
        <Logo />
      </Box>
      <Typography variant="h4" gutterBottom>{t('importEventsTitle')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {t('importPageDescription')}
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="calendar-select-label">{t('selectCalendarToImportFrom')}</InputLabel>
        <Select
          labelId="calendar-select-label"
          value={selectedCalendarId}
          label={t('selectCalendarToImportFrom')}
          onChange={(e) => setSelectedCalendarId(e.target.value)}
          disabled={loadingCalendars || importing}
        >
          {loadingCalendars ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 2 }} /> {t('loadingCalendars')}
            </MenuItem>
          ) : (
            calendars.map((cal) => (
              <MenuItem key={cal.id} value={cal.id}>
                {cal.summary}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {importError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {importError}
        </Alert>
      )}
      {importSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {importSuccess}
        </Alert>
      )}

      {selectedCalendarId && (eventGroupsForDisplay.length > 0 || loadingEvents) && (
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedGroupNames.size === eventGroupsForDisplay.length && eventGroupsForDisplay.length > 0}
                onChange={handleToggleSelectAll}
                disabled={loadingEvents || importing || eventGroupsForDisplay.length === 0}
              />
            }
            label={t('selectAll')}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleImportEvents}
            disabled={selectedGroupNames.size === 0 || importing || loadingEvents}
            sx={{ ml: 2 }}
          >
            {importing ? <CircularProgress size={24} /> : t('importSelectedGroups', { count: selectedGroupNames.size })}
          </Button>
        </Box>
      )}

      {loadingEvents ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>{t('loadingEvents')}</Typography>
        </Box>
      ) : eventGroupsForDisplay.length > 0 ? (
        <Grid container spacing={0}>
          {eventGroupsForDisplay.map((eventGroup) => (
            <Grid item xs={12} key={eventGroup[0].id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedGroupNames.has(eventGroup[0].name)}
                    onChange={() => handleToggleSelectGroup(eventGroup[0].name)}
                    disabled={importing}
                  />
                }
                label={<ImportEventCard eventGroup={eventGroup} />}
                sx={{
                  width: "100%",
                  alignItems: "flex-start",
                  margin: 0,
                  '.MuiFormControlLabel-label': { width: '100%' }
                }}
              />
            </Grid>
          ))}
        </Grid>
      ) : selectedCalendarId && !loadingEvents ? (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          {t('noImportableEventsFound')}
        </Typography>
      ) : (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          {t('pleaseSelectCalendar')}
        </Typography>
      )}
    </Box>
  );
};

export default ImportEventsPage;
