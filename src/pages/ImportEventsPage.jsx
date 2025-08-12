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
import { fetchCalendarEvents, createEvent, getOrCreateChroniconCalendar } from "../services/googleService";
import { parseGoogleEvent, groupEventsByName } from "../services/eventService";
import EventCard from "../components/EventCard";

const ImportEventsPage = () => {
  const { user, calendar, appLoading, authLoading, error, handleSignIn } = useContext(GlobalContext);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [eventsToImport, setEventsToImport] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState(new Set());
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
          setCalendars(response.result.items);
        } catch (err) {
          setImportError("Error loading calendars: " + (err.message || String(err)));
        } finally {
          setLoadingCalendars(false);
        }
      }
    };
    loadCalendars();
  }, [user]);

  useEffect(() => {
    const loadEvents = async () => {
      if (selectedCalendarId && user) {
        setLoadingEvents(true);
        setEventsToImport([]);
        setSelectedEvents(new Set());
        setImportError(null);
        try {
          // Fetch events with singleEvents: true to get all occurrences
          const googleEvents = await fetchCalendarEvents(selectedCalendarId, true);
          const parsedEvents = googleEvents.map(parseGoogleEvent).filter(Boolean);
          setEventsToImport(parsedEvents);
        } catch (err) {
          setImportError("Error loading events: " + (err.message || String(err)));
        } finally {
          setLoadingEvents(false);
        }
      }
    };
    loadEvents();
  }, [selectedCalendarId, user]);

  const handleToggleSelectAll = (event) => {
    if (event.target.checked) {
      const allEventIds = new Set(eventsToImport.map((e) => e.id));
      setSelectedEvents(allEventIds);
    } else {
      setSelectedEvents(new Set());
    }
  };

  const handleToggleSelectEvent = (eventId) => {
    setSelectedEvents((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(eventId)) {
        newSelected.delete(eventId);
      } else {
        newSelected.add(eventId);
      }
      return newSelected;
    });
  };

  const handleImportEvents = async () => {
    if (!calendar?.id) {
      setImportError("Chronicon calendar not found. Please sign in again.");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    let importedCount = 0;

    try {
      // Fetch existing Chronicon events for duplicate check
      const chroniconEvents = await fetchCalendarEvents(calendar.id, true);
      const parsedChroniconEvents = chroniconEvents.map(parseGoogleEvent).filter(Boolean);

      for (const eventId of selectedEvents) {
        const eventToImport = eventsToImport.find((e) => e.id === eventId);
        if (!eventToImport) continue;

        // Check for duplicate (same name and start date/time)
        const isDuplicate = parsedChroniconEvents.some(
          (e) =>
            e.name === eventToImport.name &&
            e.startDate.getTime() === eventToImport.startDate.getTime()
        );

        if (!isDuplicate) {
          // Create a new event object suitable for Google Calendar API
          const newGoogleEvent = {
            summary: eventToImport.name,
            start: { dateTime: eventToImport.startDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end: { dateTime: eventToImport.endDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            description: eventToImport.description,
            // Add other fields as needed, e.g., colorId, extendedProperties for tags
          };

          if (eventToImport.colorId) {
            newGoogleEvent.colorId = eventToImport.colorId;
          }

          if (eventToImport.tags && eventToImport.tags.length > 0) {
            newGoogleEvent.extendedProperties = {
              private: {
                chroniconTags: JSON.stringify(eventToImport.tags)
              }
            };
          }

          await createEvent(calendar.id, newGoogleEvent);
          importedCount++;
        }
      }
      setImportSuccess(`Successfully imported ${importedCount} events.`);
      setSelectedEvents(new Set()); // Clear selection after import
    } catch (err) {
      setImportError("Error during import: " + (err.message || String(err)));
    } finally {
      setImporting(false);
    }
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
      <Typography variant="h4" gutterBottom>Import Events</Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="calendar-select-label">Select Calendar</InputLabel>
        <Select
          labelId="calendar-select-label"
          value={selectedCalendarId}
          label="Select Calendar"
          onChange={(e) => setSelectedCalendarId(e.target.value)}
          disabled={loadingCalendars || importing}
        >
          {loadingCalendars ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 2 }} /> Loading Calendars...
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

      {selectedCalendarId && (eventsToImport.length > 0 || loadingEvents) && (
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedEvents.size === eventsToImport.length && eventsToImport.length > 0}
                onChange={handleToggleSelectAll}
                disabled={loadingEvents || importing || eventsToImport.length === 0}
              />
            }
            label="Select All"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleImportEvents}
            disabled={selectedEvents.size === 0 || importing || loadingEvents}
            sx={{ ml: 2 }}
          >
            {importing ? <CircularProgress size={24} /> : "Import Selected Events"}
          </Button>
        </Box>
      )}

      {loadingEvents ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading Events...</Typography>
        </Box>
      ) : eventsToImport.length > 0 ? (
        <Grid container spacing={2}>
          {eventsToImport.map((event) => (
            <Grid item xs={12} key={event.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedEvents.has(event.id)}
                    onChange={() => handleToggleSelectEvent(event.id)}
                    disabled={importing}
                  />
                }
                label={
                  <EventCard
                    event={event}
                    // Pass necessary props for EventCard, but disable interactive actions
                    onOpenActionDialog={() => {}}
                    onDirectEdit={() => {}}
                    onDelete={() => {}}
                    disableActions={true} // Custom prop to disable actions in EventCard
                  />
                }
                sx={{ width: "100%", alignItems: "flex-start", margin: 0, 
                      '.MuiFormControlLabel-label': { width: '100%' } 
                    }}
              />
            </Grid>
          ))}
        </Grid>
      ) : selectedCalendarId && !loadingEvents ? (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          No events found in the selected calendar.
        </Typography>
      ) : (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          Please select a calendar to view events.
        </Typography>
      )}
    </Box>
  );
};

export default ImportEventsPage;
