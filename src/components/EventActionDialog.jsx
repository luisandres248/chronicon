import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

const EventActionDialog = ({ open, onClose, event, onGoToCalendar, onAddRecurrence }) => {
  // If no event is provided, don't render the dialog.
  // This can happen if the dialog is part of a component that might not yet have event data.
  if (!event) {
    return null;
  }

  const handleGoToCalendar = () => {
    if (onGoToCalendar) {
      onGoToCalendar(event);
    }
    onClose(); // Close dialog after action
  };

  const handleAddRecurrence = () => {
    if (onAddRecurrence) {
      onAddRecurrence(event);
    }
    onClose(); // Close dialog after action
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="event-action-dialog-title">
      <DialogTitle id="event-action-dialog-title">
        Acciones para: {event.name}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Selecciona la acción que deseas realizar para este evento.
        </Typography>
        {/* Optional: Could add more event details here if needed */}
        {/* <Typography variant="caption">ID: {event.id}</Typography> */}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Box>
          <Button onClick={handleGoToCalendar} variant="outlined" sx={{ mr: 1 }}>
            Ver en Calendario
          </Button>
          <Button onClick={handleAddRecurrence} variant="contained">
            Añadir Recurrencia
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EventActionDialog;
