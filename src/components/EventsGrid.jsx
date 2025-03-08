import React, { useState, useContext, useEffect } from "react";
import { Grid, Box, Fab, Typography, CircularProgress, Button, Alert, Snackbar } from "@mui/material";
import { Add } from "@mui/icons-material";
import { GlobalContext } from "../context/GlobalContext";
import EventCard from "./EventCard";
import EventForm from "./EventForm";
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
  } = useContext(GlobalContext);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    console.log("Current events:", events);
    console.log("Calendar:", calendar);
  }, [events, calendar]);

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
    if (!calendar?.id) {
      console.error("No calendar ID available");
      return;
    }

    try {
      setProcessing(true);
      console.log("Creating event with form data:", formData);
      
      // Validar que el nombre no esté vacío
      if (!formData.name || formData.name.trim() === "") {
        throw new Error("El nombre del evento no puede estar vacío");
      }
      
      const eventObject = createEventObject({
        name: formData.name.trim(),
        startDate: formData.startDate,
        description: formData.description || "",
        color: formData.color || "#ffffff",
        tags: formData.tags || [],
      });
      
      console.log("Creating event with data:", eventObject);

      // Create event in Google Calendar
      const createdEvent = await createEvent(calendar.id, eventObject);
      console.log("Response from Google Calendar:", createdEvent);

      if (!createdEvent) {
        throw new Error("Failed to create event in Google Calendar");
      }

      // Parse the event returned from Google Calendar
      const parsedEvent = parseGoogleEvent(createdEvent);
      console.log("Parsed created event:", parsedEvent);

      if (parsedEvent) {
        addEvent(parsedEvent);
        setFormOpen(false);
      } else {
        throw new Error("Failed to parse created event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      // You might want to show an error message to the user here
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateEvent = async (formData) => {
    if (!calendar?.id || !selectedEvent?.id) {
      console.error("Missing calendar ID or event ID");
      return;
    }

    try {
      setProcessing(true);
      console.log("Updating event with data:", {
        original: selectedEvent,
        formData: formData
      });
      
      // Crear objeto de evento asegurando que se incluyan todos los campos necesarios
      const eventObject = createEventObject({
        id: selectedEvent.id,
        name: formData.name || selectedEvent.name,
        startDate: formData.startDate || selectedEvent.startDate,
        description: formData.description !== undefined ? formData.description : selectedEvent.description,
        color: formData.color || selectedEvent.color,
        tags: formData.tags || selectedEvent.tags,
      });
      
      console.log("Event object for update:", eventObject);
      
      const updatedEvent = await updateEvent(
        calendar.id,
        selectedEvent.id,
        eventObject
      );
      
      console.log("Response from Google Calendar update:", updatedEvent);
      
      const parsedEvent = parseGoogleEvent(updatedEvent);
      console.log("Parsed updated event:", parsedEvent);
      
      if (parsedEvent) {
        updateEventInState(parsedEvent);
        setFormOpen(false);
        setSelectedEvent(null);
      } else {
        throw new Error("Failed to parse updated event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      // Mostrar mensaje de error al usuario
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!calendar?.id || !event?.id) {
      console.error("Missing calendar ID or event ID");
      return;
    }

    try {
      setProcessing(true);
      await deleteEvent(calendar.id, event.id);
      deleteEventInState(event.id);
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedEvent(null);
    
    // Recargar eventos para asegurar que la UI esté actualizada
    if (calendar?.id && user) {
      setProcessing(true);
      fetchCalendarEvents(calendar.id)
        .then(calendarEvents => {
          const parsedEvents = calendarEvents
            .map(parseGoogleEvent)
            .filter(Boolean);
          
          // Actualizar el estado global con los eventos recargados
          parsedEvents.forEach(event => {
            updateEventInState(event);
          });
        })
        .catch(error => {
          console.error("Error reloading events after form close:", error);
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  };

  if (globalLoading || processing) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (globalError) {
    return (
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <Typography 
          variant="h6" 
          color="error" 
          gutterBottom
          sx={{ 
            textAlign: 'center',
            maxWidth: '600px'
          }}
        >
          {globalError}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            textAlign: 'center',
            maxWidth: '600px',
            mt: 2
          }}
        >
          {globalError.includes("session has expired") ? (
            <>
              Your authentication session has expired. Please sign out and sign in again to refresh your access.
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleSignOut} 
                sx={{ mt: 2 }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            "Please try again later or contact support if the problem persists."
          )}
        </Typography>
      </Box>
    );
  }

  if (!calendar) {
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
          disabled={globalLoading || authLoading}
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

  if (!events.length) {
    return (
      <Box sx={{ p: 3, position: "relative", minHeight: "100vh" }}>
        <Typography>
          No events found. Create one by clicking the + button.
        </Typography>
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => {
            setSelectedEvent(null);
            setFormOpen(true);
          }}
        >
          <Add />
        </Fab>
        <EventForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setSelectedEvent(null);
          }}
          onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
          event={selectedEvent}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: "relative", minHeight: "100vh" }}>
      <Grid container spacing={3}>
        {events.map((event) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={event.id}>
            <EventCard
              event={event}
              onEdit={handleEdit}
              onDelete={handleDeleteEvent}
            />
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => {
          setSelectedEvent(null);
          setFormOpen(true);
        }}
      >
        <Add />
      </Fab>

      <EventForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        event={selectedEvent}
      />
    </Box>
  );
};

export default EventsGrid;
