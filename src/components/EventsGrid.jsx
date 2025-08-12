import React, { useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Grid, Box, Fab, Typography, CircularProgress, Button, Alert, FormControl, 
  InputLabel, Select, MenuItem, IconButton 
} from "@mui/material";
import { Add, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import EventCard from "./EventCard";
import EventForm from "./EventForm";
import EventActionDialog from "./EventActionDialog";
import AddRecurrenceDialog from "./AddRecurrenceDialog";
import Logo from "./Logo";
import SortingControls from "./SortingControls";

const EventsGrid = () => {
  const {
    // State from context
    events,
    calendar,
    appLoading,
    authLoading,
    eventsLoading,
    processing,
    error,
    authError,
    // Methods from context
    handleSignIn,
    handleSignOut,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleSaveRecurrence,
    reloadEvents,
  } = useContext(GlobalContext);

  // Local UI state
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sortCriteria, setSortCriteria] = useState("startDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [eventForActionDialog, setEventForActionDialog] = useState(null);
  const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false);
  const [eventForRecurrenceDialog, setEventForRecurrenceDialog] = useState(null);

  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- DERIVED STATE (SORTING LOGIC) ---
  const groupedEventsByName = useMemo(() => {
    if (!events || events.length === 0) return {};
    return events.reduce((acc, event) => {
      const name = event.name;
      if (!acc[name]) acc[name] = [];
      acc[name].push(event);
      return acc;
    }, {});
  }, [events]);

  const eventSeriesData = useMemo(() => {
    return Object.entries(groupedEventsByName).map(([seriesName, seriesEvents]) => {
      seriesEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      return {
        seriesName,
        firstOccurrenceDate: new Date(seriesEvents[0].startDate),
        lastOccurrenceDate: new Date(seriesEvents[seriesEvents.length - 1].startDate),
        recurrenceCount: seriesEvents.length,
        displayEvent: seriesEvents[0],
        allOccurrences: seriesEvents,
      };
    });
  }, [groupedEventsByName]);

  const sortedEventsForGrid = useMemo(() => {
    let sorted = [...eventSeriesData];
    sorted.sort((a, b) => {
      let compareResult = 0;
      switch (sortCriteria) {
        case "lastRecurrence": compareResult = a.lastOccurrenceDate - b.lastOccurrenceDate; break;
        case "name": compareResult = a.seriesName.localeCompare(b.seriesName); break;
        case "recurrenceCount": compareResult = a.recurrenceCount - b.recurrenceCount; break;
        default: compareResult = a.firstOccurrenceDate - b.firstOccurrenceDate; break;
      }
      return sortOrder === "asc" ? compareResult : -compareResult;
    });
    return sorted;
  }, [eventSeriesData, sortCriteria, sortOrder]);

  // --- UI HANDLERS ---
  const handleOpenActionDialog = (event) => {
    setEventForActionDialog(event);
    setIsActionDialogOpen(true);
  };

  const handleCloseActionDialog = () => {
    setIsActionDialogOpen(false);
    setEventForActionDialog(null);
  };

  const handleDirectEdit = (event) => {
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedEvent(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (selectedEvent) {
        await handleUpdateEvent(selectedEvent.id, formData);
      } else {
        await handleCreateEvent(formData);
      }
      handleFormClose();
    } catch (err) {
      console.error("Error submitting form:", err); // Optionally show error in a snackbar
    }
  };

  const handleDeleteFromForm = async (eventId) => {
    try {
      await handleDeleteEvent(eventId);
      handleFormClose();
    } catch (err) {
      console.error("Error deleting from form:", err);
    }
  };
  
  const handleGoToCalendar = (event) => {
    const date = event?.startDate ? new Date(event.startDate).toISOString().split('T')[0] : null;
    navigate("/calendar", { state: { selectedEventId: event?.id, selectedDate: date } });
    handleCloseActionDialog();
  };

  const handleAddRecurrenceClicked = (event) => {
    handleCloseActionDialog();
    setEventForRecurrenceDialog(event);
    setIsRecurrenceDialogOpen(true);
  };

  const handleSaveRecurrenceAndClose = async (originalEvent, newDate) => {
    try {
      await handleSaveRecurrence(originalEvent, newDate);
      setIsRecurrenceDialogOpen(false);
      setEventForRecurrenceDialog(null);
    } catch (err) {
      console.error("Error saving recurrence:", err);
    }
  };

  // --- RENDER LOGIC ---
  if (appLoading || eventsLoading || processing) {
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button variant="outlined" color="primary" onClick={handleSignOut} sx={{ mt: 2 }}>Sign Out & Try Again</Button>
      </Box>
    );
  }

  if (!calendar) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" gutterBottom>Bienvenido a Chronicon</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px', mb: 3 }}>
          Inicia sesión con Google para empezar.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleSignIn} disabled={authLoading}>
          {authLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
        </Button>
        {authError && <Alert severity="error" sx={{ mt: 2, maxWidth: '600px' }}>{authError}</Alert>}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: "relative", minHeight: "100vh" }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: 400, ml: 2 }}>
          <Logo />
        </Box>
        <SortingControls 
          sortCriteria={sortCriteria} 
          setSortCriteria={setSortCriteria} 
          sortOrder={sortOrder} 
          setSortOrder={setSortOrder} 
        />
      </Box>

      {sortedEventsForGrid.length > 0 ? (
        <Grid container spacing={3}>
          {sortedEventsForGrid.map((series) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={series.displayEvent.id}>
              <EventCard
                event={series.displayEvent}
                onOpenActionDialog={handleOpenActionDialog}
                onDirectEdit={handleDirectEdit}
                onDelete={() => handleDeleteEvent(series.displayEvent.id)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          {t('noEventsMessageComprehensive')}
        </Typography>
      )}

      <Fab color="primary" sx={{ position: "fixed", bottom: 16, right: 16 }} onClick={() => { setSelectedEvent(null); setFormOpen(true); }}>
        <Add />
      </Fab>

      <EventForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        event={selectedEvent}
        onDelete={selectedEvent ? () => handleDeleteFromForm(selectedEvent.id) : undefined}
      />

      <EventActionDialog
        open={isActionDialogOpen}
        onClose={handleCloseActionDialog}
        event={eventForActionDialog}
        onGoToCalendar={handleGoToCalendar}
        onAddRecurrence={handleAddRecurrenceClicked}
      />
      
      <AddRecurrenceDialog
        open={isRecurrenceDialogOpen}
        onClose={() => setIsRecurrenceDialogOpen(false)}
        onSubmit={handleSaveRecurrenceAndClose}
        eventToRecur={eventForRecurrenceDialog}
      />
    </Box>
  );
};

export default EventsGrid;
