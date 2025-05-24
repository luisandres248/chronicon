import React from 'react';
import { Dialog, DialogContent, Button, Box } from '@mui/material';
import { CalendarMonth, Repeat } from '@mui/icons-material'; // Import icons

const EventActionDialog = ({ open, onClose, event, onGoToCalendar, onAddRecurrence }) => {
  if (!event) {
    return null;
  }

  const handleGoToCalendarClick = () => {
    if (onGoToCalendar) {
      onGoToCalendar(event);
    }
    onClose(); 
  };

  const handleAddRecurrenceClick = () => {
    if (onAddRecurrence) {
      onAddRecurrence(event);
    }
    onClose(); 
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* Removed DialogTitle */}
      <DialogContent sx={{ pt: 2, '& .MuiButton-root': { mb: 1.5, justifyContent: 'flex-start' } }}> 
        {/* DialogContent will contain the buttons directly */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <Button 
            onClick={handleGoToCalendarClick} 
            variant="text" // Using text variant for a cleaner look
            startIcon={<CalendarMonth />}
            sx={{ color: 'text.primary' }} // Ensure good contrast
          >
            Ver en el calendario
          </Button>
          <Button 
            onClick={handleAddRecurrenceClick} 
            variant="text" // Using text variant
            startIcon={<Repeat />}
            sx={{ color: 'text.primary' }}
          >
            Añadir recurrencia
          </Button>
        </Box>
      </DialogContent>
      {/* Removed DialogActions and Cancel button */}
    </Dialog>
  );
};

export default EventActionDialog;
