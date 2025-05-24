import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Grid, Box, Fab, Typography, CircularProgress, Button, Alert, Snackbar,
  FormControl, InputLabel, Select, MenuItem, IconButton 
} from "@mui/material";
import { Add, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { GlobalContext } from "../context/GlobalContext";
import EventCard from "./EventCard";
import EventForm from "./EventForm";
import EventActionDialog from "./EventActionDialog";
import AddRecurrenceDialog from "./AddRecurrenceDialog";
import { createEventObject, parseGoogleEvent } from "../services/eventService";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  fetchCalendarEvents,
  signIn,
  signOut,
} from "../services/googleService";

const EventsGrid = () => {
  const {
    events,
    calendar,
    user,
    loading: globalLoading,
    error: globalError,
    addEvent,
    updateEvent: updateEventInState,
    deleteEvent: deleteEventInState,
    setUser,
    setCalendar,
    setAllEvents,
  } = useContext(GlobalContext);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  
  // State for sorting
  const [sortCriteria, setSortCriteria] = useState("startDate"); // Default sort criteria
  const [sortOrder, setSortOrder] = useState("asc"); // Default sort order: 'asc' or 'desc'

  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [eventForActionDialog, setEventForActionDialog] = useState(null);

  const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false);
  const [eventForRecurrenceDialog, setEventForRecurrenceDialog] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // console.log("Current events:", events);
    // console.log("Calendar:", calendar);
  }, [events, calendar]);

  useEffect(() => {
    const handlePopupBlocked = (event) => {
      console.log("Popup blocked event received:", event.detail);
      setPopupBlocked(true);
      setAuthError(event.detail.message || "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio.");
    };
    window.addEventListener('auth-popup-blocked', handlePopupBlocked);
    return () => window.removeEventListener('auth-popup-blocked', handlePopupBlocked);
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setPopupBlocked(false);
      const response = await signIn((message, isError) => {
        setAuthError(isError ? `Error: ${message}` : `Status: ${message}`);
      });
      if (response?.userProfile) {
        setUser(response.userProfile);
        setCalendar(response.calendar);
      }
    } catch (error) {
      if (error?.error !== "popup_closed_by_user") {
        console.error("Error signing in:", error);
        setAuthError(error.message || "Error al iniciar sesión. Por favor, intenta de nuevo.");
        if (error.type === 'popup_failed_to_open' || error.type === 'popup_closed') {
          setPopupBlocked(true);
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      await signOut();
      setUser(null);
      setCalendar(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateEvent = async (formData) => {
    if (!calendar?.id) return;
    try {
      setProcessing(true);
      if (!formData.name || formData.name.trim() === "") throw new Error("El nombre del evento no puede estar vacío");
      const eventObject = createEventObject({
        name: formData.name.trim(),
        startDate: formData.startDate,
        description: formData.description || "",
        colorId: formData.colorId || null,
        tags: formData.tags || [],
      });
      const createdEvent = await createEvent(calendar.id, eventObject);
      if (!createdEvent) throw new Error("Failed to create event in Google Calendar");
      const parsedEvent = parseGoogleEvent(createdEvent);
      if (parsedEvent) {
        addEvent(parsedEvent);
        setFormOpen(false); // Close form on successful creation
      } else {
        throw new Error("Failed to parse created event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      // Consider setting an error state to show in a Snackbar or Alert
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateEvent = async (formData) => {
    if (!calendar?.id || !selectedEvent?.id) return;
    try {
      setProcessing(true);
      const eventObject = createEventObject({
        id: selectedEvent.id,
        name: formData.name || selectedEvent.name,
        startDate: formData.startDate || selectedEvent.startDate,
        description: formData.description !== undefined ? formData.description : selectedEvent.description,
        colorId: formData.colorId !== undefined ? formData.colorId : selectedEvent.colorId,
        tags: formData.tags || selectedEvent.tags,
      });
      const updatedEvent = await updateEvent(calendar.id, selectedEvent.id, eventObject);
      if (!updatedEvent) throw new Error("No response received from Google Calendar API");
      const parsedEvent = parseGoogleEvent(updatedEvent);
      if (parsedEvent) {
        updateEventInState(parsedEvent);
        setFormOpen(false); // Close form
        setSelectedEvent(null); // Clear selected event
        await reloadEvents();
      } else {
        throw new Error("Failed to parse updated event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      // Consider setting an error state
    } finally {
      setProcessing(false);
    }
  };

  const reloadEvents = async () => {
    if (!calendar?.id || !user) return;
    try {
      // console.log("Reloading events..."); // Optional: for debugging
      const calendarEvents = await fetchCalendarEvents(calendar.id);
      if (!calendarEvents || !Array.isArray(calendarEvents)) {
        console.error("Invalid response when reloading events");
        return;
      }
      setAllEvents(calendarEvents);
    } catch (error) {
      console.error("Error reloading events:", error);
    }
  };

  // This is for deleting from EventCard (quick delete)
  const handleDeleteEvent = async (eventToDelete) => {
    if (!calendar?.id || !eventToDelete?.id) return;
    // Optional: Add a window.confirm here if desired for EventCard deletions too
    // if (!window.confirm(`¿Estás seguro de que quieres eliminar el evento "${eventToDelete.name}" desde la tarjeta?`)) return;

    setProcessing(true);
    try {
      await deleteEvent(calendar.id, eventToDelete.id);
      deleteEventInState(eventToDelete.id);
      // reloadEvents might be good here if other derived state depends on the full list
    } catch (error) {
      console.error("Error deleting event from card:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  // This is for deleting from EventForm
  const handleDeleteEventFromForm = async (eventId) => {
    if (!calendar?.id || !eventId) {
      console.error("Missing calendar ID or event ID for form deletion");
      return; 
    }
    setProcessing(true);
    try {
      await deleteEvent(calendar.id, eventId);
      deleteEventInState(eventId);
      // setFormOpen(false); // EventForm calls its own onClose, which triggers handleFormClose
      // setSelectedEvent(null); // handleFormClose will also do this.
      await reloadEvents(); // Reload to ensure consistency
    } catch (error) {
      console.error("Error deleting event from form:", error);
      // Optionally: set an error state to show to the user
    } finally {
      setProcessing(false);
      // Ensure form is closed and selected event is cleared, even if EventForm's onClose doesn't fire due to an error above.
      // However, EventForm's own onClose should typically handle this.
      // If deletion is successful, EventForm's onClose is called by its own handleDelete.
      // If an error occurs here, the form might stay open, which could be intended if user needs to retry.
    }
  };

  // Renamed from handleEventCardClick
  const handleOpenActionDialog = (event) => {
    setEventForActionDialog(event);
    setIsActionDialogOpen(true);
  };

  // New handler for direct edit from EventCard
  const handleDirectEdit = (event) => {
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const handleCloseActionDialog = () => {
    setIsActionDialogOpen(false);
    setEventForActionDialog(null);
  };

  const handleGoToCalendar = (event) => {
    if (event && event.startDate) {
      const date = event.startDate instanceof Date ? event.startDate.toISOString().split('T')[0] : new Date(event.startDate).toISOString().split('T')[0];
      navigate("/calendar", { state: { selectedEventId: event.id, selectedDate: date } });
    } else {
      navigate("/calendar", { state: { selectedEventId: event?.id } });
    }
    handleCloseActionDialog();
  };
  
  const handleAddRecurrenceClicked = (event) => {
    handleCloseActionDialog(); 
    setEventForRecurrenceDialog(event);
    setIsRecurrenceDialogOpen(true); 
  };

  const handleCloseRecurrenceDialog = () => {
    setIsRecurrenceDialogOpen(false);
    setEventForRecurrenceDialog(null);
  };

  const handleSaveRecurrence = async (originalEvent, newDate) => {
    if (!calendar?.id || !originalEvent) return;
    setProcessing(true);
    try {
      const recurrenceEventObject = createEventObject({
        name: originalEvent.name, description: originalEvent.description || "",
        colorId: originalEvent.colorId || null, tags: originalEvent.tags || [],
        startDate: newDate,
      });
      const createdCalendarEvent = await createEvent(calendar.id, recurrenceEventObject);
      if (!createdCalendarEvent) throw new Error("Failed to create recurring event in Google Calendar.");
      const parsedEvent = parseGoogleEvent(createdCalendarEvent);
      if (parsedEvent) addEvent(parsedEvent);
      else throw new Error("Failed to parse recurring event from Google Calendar response.");
    } catch (error) {
      console.error("Error creating recurring event:", error);
    } finally {
      setProcessing(false);
      handleCloseRecurrenceDialog();
    }
  };
  
  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedEvent(null);
    // reloadEvents() here can be heavy if form was just cancelled.
    // It's primarily for after create/update/delete.
    // Consider if reloadEvents is needed for simple close without action.
    // For now, keeping it as it was to ensure data consistency after potential edits.
    reloadEvents().catch(error => {
      console.error("Error reloading events after form close:", error);
    });
  };

  if (globalLoading || processing) {
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><CircularProgress /></Box>;
  }

  if (globalError) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="error" gutterBottom sx={{ textAlign: 'center', maxWidth: '600px' }}>{globalError}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '600px', mt: 2 }}>
          {globalError.includes("session has expired") ? (
            <>
              Your authentication session has expired. Please sign out and sign in again.
              <Button variant="outlined" color="primary" onClick={handleSignOut} sx={{ mt: 2 }}>Sign Out</Button>
            </>
          ) : "Please try again later or contact support."}
        </Typography>
      </Box>
    );
  }

  if (!calendar) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" gutterBottom>Bienvenido a Chronicon</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px', mb: 3 }}>
          Por favor inicia sesión con tu cuenta de Google para acceder a tu calendario Chronicon.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleSignIn} disabled={globalLoading || authLoading}>
          {authLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
        </Button>
        {authError && <Alert severity="error" sx={{ mt: 2, maxWidth: '600px' }}>{authError}</Alert>}
        {popupBlocked && <Alert severity="warning" sx={{ mt: 2, maxWidth: '600px' }}>El navegador bloqueó la ventana emergente. Por favor, asegúrate de permitir ventanas emergentes.</Alert>}
      </Box>
    );
  }

  if (!events.length && !globalLoading) {
    return (
      <Box sx={{ p: 3, position: "relative", minHeight: "100vh" }}>
        <Typography>No events found. Create one by clicking the + button.</Typography>
        <Fab color="primary" sx={{ position: "fixed", bottom: 16, right: 16 }} onClick={() => { setSelectedEvent(null); setFormOpen(true); }}>
          <Add />
        </Fab>
        <EventForm // For creating new event when list is empty
          open={formOpen}
          onClose={handleFormClose}
          onSubmit={handleCreateEvent} // Explicitly handleCreateEvent
          event={null} // No event to edit
          onDelete={undefined} // No delete for new event
        />
      </Box>
    );
  }

  // 1. Process events for sorting (Grouping logic)
  const groupedEventsByName = useMemo(() => {
    if (!events || events.length === 0) return {};
    return events.reduce((acc, event) => {
      const name = event.name;
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(event);
      return acc;
    }, {});
  }, [events]);

  // 2. Create sortable event series data
  const eventSeriesData = useMemo(() => {
    return Object.entries(groupedEventsByName).map(([seriesName, seriesEvents]) => {
      // Sort individual occurrences by date to reliably find first/last
      seriesEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      return {
        seriesName,
        firstOccurrenceDate: new Date(seriesEvents[0].startDate),
        lastOccurrenceDate: new Date(seriesEvents[seriesEvents.length - 1].startDate),
        recurrenceCount: seriesEvents.length,
        // Use the first occurrence for card display details (ID, color, etc.)
        // and for actions like edit/delete that target a specific instance.
        displayEvent: seriesEvents[0], 
        allOccurrences: seriesEvents, 
      };
    });
  }, [groupedEventsByName]);

  // 3. Sort processed events
  const sortedEventsForGrid = useMemo(() => {
    let sorted = [...eventSeriesData]; // Use the processed series data
    sorted.sort((a, b) => {
      let compareResult = 0;
      switch (sortCriteria) {
        case "lastRecurrence":
          compareResult = a.lastOccurrenceDate - b.lastOccurrenceDate;
          break;
        case "name":
          compareResult = a.seriesName.localeCompare(b.seriesName);
          break;
        case "recurrenceCount":
          compareResult = a.recurrenceCount - b.recurrenceCount;
          break;
        case "startDate": // Default case
        default:
          compareResult = a.firstOccurrenceDate - b.firstOccurrenceDate;
          break;
      }
      return sortOrder === "asc" ? compareResult : -compareResult;
    });
    return sorted;
  }, [eventSeriesData, sortCriteria, sortOrder]);


  // Main return with consolidated conditional rendering
  return (
    <Box sx={{ p: 3, position: "relative", minHeight: "100vh" }}>
      {/* Sorting Controls - Placed here so they are always visible if calendar exists */}
      {calendar && ( // Only show sorting if calendar is available
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220, mr: 1 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortCriteria}
              label="Ordenar por"
              onChange={(e) => setSortCriteria(e.target.value)}
            >
              <MenuItem value="startDate">Fecha de inicio del evento</MenuItem>
              <MenuItem value="lastRecurrence">Fecha de última recurrencia</MenuItem>
              <MenuItem value="name">Alfabéticamente por nombre</MenuItem>
              <MenuItem value="recurrenceCount">Cantidad de recurrencias</MenuItem>
              {/* <MenuItem value="modifiedDate" disabled>Fecha de última modificación (Próximamente)</MenuItem> */}
            </Select>
          </FormControl>
          <IconButton onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
          </IconButton>
        </Box>
      )}

      {/* Grid or "No Events" Message */}
      {calendar && sortedEventsForGrid.length > 0 && (
        <Grid container spacing={3}>
          {sortedEventsForGrid.map((series) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={series.displayEvent.id}>
              <EventCard
                event={series.displayEvent}
                onOpenActionDialog={handleOpenActionDialog} // Changed from onEdit
                onDirectEdit={handleDirectEdit} // New prop
                onDelete={() => handleDeleteEvent(series.displayEvent)}
              />
            </Grid>
          ))}
        </Grid>
      )}
      
      {calendar && sortedEventsForGrid.length === 0 && !globalLoading && (
         <Typography sx={{textAlign: 'center', mt: 4}}>
           No hay eventos para mostrar. Crea uno nuevo haciendo clic en el botón "+"
         </Typography>
      )}

      {/* FAB for creating new events - always visible if calendar exists */}
      {calendar && (
        <Fab 
        color="primary"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => {
          setSelectedEvent(null); // Clear selected event for new form
          setFormOpen(true);
        }}
      >
        <Add />
      </Fab>
      )} 

      <EventForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        event={selectedEvent} 
        onDelete={selectedEvent ? handleDeleteEventFromForm : undefined} // Pass delete handler only if editing
      />

      <EventActionDialog
        open={isActionDialogOpen}
        onClose={handleCloseActionDialog}
        event={eventForActionDialog}
        onGoToCalendar={handleGoToCalendar}
        onAddRecurrence={handleAddRecurrenceClicked}
        // Future: could add onEdit prop here to directly open EventForm for editing
        // onEditEvent={(event) => { setSelectedEvent(event); setFormOpen(true); handleCloseActionDialog(); }}
      />
      
      <AddRecurrenceDialog
        open={isRecurrenceDialogOpen}
        onClose={handleCloseRecurrenceDialog}
        onSubmit={handleSaveRecurrence}
        eventToRecur={eventForRecurrenceDialog}
        // initialDate prop is managed by AddRecurrenceDialog's own useEffect or passed if needed
      />
    </Box>
  );
};

export default EventsGrid;
