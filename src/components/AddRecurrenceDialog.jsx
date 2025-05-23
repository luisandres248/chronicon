import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // Changed from DateTimePicker
// Assuming LocalizationProvider is already set up in App.jsx or main.jsx,
// which is a valid assumption as EventForm.jsx uses it.

const AddRecurrenceDialog = ({ open, onClose, onSubmit, eventToRecur, initialDate }) => {
  const [recurrenceDate, setRecurrenceDate] = useState(initialDate || new Date());

  useEffect(() => {
    // When the dialog opens, or if the initialDate prop changes while open (less likely),
    // set the recurrenceDate. If an initialDate is provided, use that; otherwise, default to now.
    // This ensures that each time the dialog is opened, it defaults to the passed initialDate
    // or to the current time if no initialDate is specified.
    if (open) {
      setRecurrenceDate(initialDate || new Date());
    }
  }, [open, initialDate]); // Effect runs when 'open' or 'initialDate' prop changes

  // If there's no event to recur, don't render the dialog.
  // This handles cases where the dialog might be flagged to open before event data is ready.
  if (!eventToRecur) {
    return null;
  }

  const handleSave = () => {
    // Pass the original event and the newly selected recurrence date to the onSubmit handler.
    if (onSubmit) {
      onSubmit(eventToRecur, recurrenceDate);
    }
    onClose(); // Close the dialog after submitting.
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="add-recurrence-dialog-title">
      <DialogTitle id="add-recurrence-dialog-title">
        Añadir Recurrencia para: {eventToRecur.name}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}> 
        {/* Added sx={{ mt: 2 }} for a bit of top margin as per the example's good practice */}
        <DatePicker // Changed from DateTimePicker
          label="Fecha de la Recurrencia"
          value={recurrenceDate}
          onChange={(newValue) => setRecurrenceDate(newValue)}
          slotProps={{ textField: { fullWidth: true, required: true } }} // Ensure the DatePicker takes full width
        />
        {/* 
          Optionally, display some original event details here if useful for context, e.g.,
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">Original Start: {new Date(eventToRecur.startDate).toLocaleString()}</Typography>
          </Box> 
        */}
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}> 
        {/* Added padding and space-between for actions */}
        <Button onClick={onClose} color="inherit"> {/* Changed color to inherit for less emphasis vs primary save */}
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddRecurrenceDialog;
