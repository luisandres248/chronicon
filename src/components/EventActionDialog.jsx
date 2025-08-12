import React, { useState } from 'react'; // Import useState
import { Dialog, DialogContent, Button, Box, DialogTitle, DialogActions, Typography } from '@mui/material'; // Import DialogTitle, DialogActions, Typography
import { CalendarMonth, Repeat, Delete } from '@mui/icons-material'; // Import Delete icon
import { useTranslation } from 'react-i18next'; // Import useTranslation

const EventActionDialog = ({ open, onClose, event, onGoToCalendar, onAddRecurrence, onDeleteOccurrence }) => { // Add onDeleteOccurrence prop
  const { t } = useTranslation(); // Initialize useTranslation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // State for confirmation dialog

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

  const handleDeleteClick = () => {
    setShowConfirmDelete(true); // Open confirmation dialog
  };

  const handleConfirmDelete = () => {
    if (onDeleteOccurrence) {
      onDeleteOccurrence(event.id); // Pass event ID to delete function
    }
    setShowConfirmDelete(false); // Close confirmation dialog
    onClose(); // Close action dialog
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false); // Close confirmation dialog
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 2, '& .MuiButton-root': { mb: 1.5, justifyContent: 'flex-start' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <Button
              onClick={handleGoToCalendarClick}
              variant="text"
              startIcon={<CalendarMonth />}
              sx={{ color: 'text.primary' }}
            >
              {t('viewInCalendar')}
            </Button>
            <Button
              onClick={handleAddRecurrenceClick}
              variant="text"
              startIcon={<Repeat />}
              sx={{ color: 'text.primary' }}
            >
              {t('addRecurrence')}
            </Button>
            {/* New Delete Occurrence Button */}
            <Button
              onClick={handleDeleteClick}
              variant="text"
              startIcon={<Delete />}
              sx={{ color: 'error.main' }} // Use error color for delete button
            >
              {t('deleteOccurrence')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDelete}
        onClose={handleCancelDelete}
        aria-labelledby="confirm-delete-dialog-title"
        aria-describedby="confirm-delete-dialog-description"
      >
        <DialogTitle id="confirm-delete-dialog-title">{t('confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography id="confirm-delete-dialog-description">
            {t('confirmDeleteOccurrenceMessage')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventActionDialog;
