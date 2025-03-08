import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Divider,
} from "@mui/material";
import { Edit, Delete, Repeat, CalendarMonth, Palette } from "@mui/icons-material";
import { format } from "date-fns";
import { GlobalContext } from "../context/GlobalContext";
import { calculateEventStats, formatTimeSince } from "../services/eventService";

const EventCard = ({ event, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { events, config } = useContext(GlobalContext);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Calcular estadísticas del evento usando la función del servicio
  const eventStats = calculateEventStats(event, events);

  const handleCardClick = (e) => {
    if (!e.target.closest("button")) {
      navigate("/calendar", { state: { selectedEvent: event.name } });
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit(event);
  };

  const handleConfirmDelete = () => {
    onDelete(event);
    setDeleteDialogOpen(false);
  };

  const formatDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
      return "No date";
    }
    try {
      return format(date, "PPP");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Determinar si el color es claro u oscuro para ajustar el color del texto
  // Usando el algoritmo WCAG para calcular el contraste
  const isLightColor = (color) => {
    if (!color) return true;
    
    // Convertir color hex a RGB
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Manejar formatos no hex
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return true; // Por defecto, asumir color claro si no es hex
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calcular luminosidad según WCAG
    // https://www.w3.org/TR/WCAG20-TECHS/G17.html
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // Umbral de 0.5 para determinar si es claro u oscuro
    return luminance > 0.5;
  };

  // Determinar el color del texto basado en el color de fondo y el modo oscuro
  const isDarkMode = config?.darkMode;
  
  // Colores para texto en modo claro
  const lightModeTextColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 
    'rgba(0, 0, 0, 0.87)';
  const lightModeSecondaryTextColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 
    'rgba(0, 0, 0, 0.6)';
  
  // Colores para texto en modo oscuro
  const darkModeTextColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 
    '#f8fafc'; // Texto claro para modo oscuro
  const darkModeSecondaryTextColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 
    '#cbd5e1'; // Texto secundario para modo oscuro
  
  // Usar los colores según el modo
  const textColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 
    (isDarkMode ? darkModeTextColor : lightModeTextColor);
  const secondaryTextColor = event.color ? 
    (isLightColor(event.color) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 
    (isDarkMode ? darkModeSecondaryTextColor : lightModeSecondaryTextColor);

  return (
    <>
      <Card
        onClick={handleCardClick}
        sx={{
          minHeight: 200,
          cursor: "pointer",
          backgroundColor: event.color || "#ffffff",
          position: "relative",
          "&:hover": {
            boxShadow: 6,
          },
          border: eventStats?.isFirstOccurrence ? '2px solid #1976d2' : 'none',
          color: textColor,
        }}
      >
        <CardContent>
          <Box sx={{ position: "absolute", top: 8, right: 8 }}>
            <IconButton size="small" onClick={handleEditClick} sx={{ color: textColor }}>
              <Edit />
            </IconButton>
            <IconButton size="small" onClick={handleDeleteClick} sx={{ color: textColor }}>
              <Delete />
            </IconButton>
          </Box>

          <Typography variant="h6" component="div" gutterBottom sx={{ color: textColor }}>
            {event.name || "Untitled Event"}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CalendarMonth fontSize="small" sx={{ mr: 0.5, opacity: 0.7, color: textColor }} />
            <Typography variant="body2" sx={{ color: secondaryTextColor }}>
              {formatDate(event.startDate)}
            </Typography>
          </Box>

          {event.color && (
            <Box 
              sx={{ 
                display: 'inline-block',
                width: 16, 
                height: 16, 
                backgroundColor: event.color,
                border: `1px solid ${secondaryTextColor}`,
                borderRadius: '4px',
                mb: 1,
                ml: 0.5
              }}
            />
          )}

          {eventStats && eventStats.totalOccurrences > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Repeat fontSize="small" sx={{ mr: 0.5, opacity: 0.7, color: textColor }} />
              <Typography variant="body2" sx={{ color: secondaryTextColor }}>
                {eventStats.isFirstOccurrence 
                  ? `Primera de ${eventStats.totalOccurrences} ocurrencias` 
                  : `Ocurrencia ${eventStats.occurrenceNumber} de ${eventStats.totalOccurrences}`}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 1, borderColor: secondaryTextColor }} />

          {eventStats && (
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1, color: textColor }}>
              {eventStats.isFirstOccurrence 
                ? `Hace ${formatTimeSince(eventStats)}` 
                : eventStats.daysSincePrevious 
                  ? `${eventStats.daysSincePrevious} días después de la anterior` 
                  : ''}
            </Typography>
          )}

          {event.description && (
            <Typography
              variant="body2"
              sx={{
                mb: 2,
                maxHeight: "3em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                color: secondaryTextColor,
              }}
            >
              {event.description}
            </Typography>
          )}

          {event.tags && event.tags.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                justifyContent: "flex-end",
                maxWidth: "calc(100% - 32px)",
              }}
            >
              {event.tags.map((tag, index) => (
                <Chip
                  key={`${tag}-${index}`}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: "0.7rem",
                    height: "20px",
                    backgroundColor: isLightColor(event.color) ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.16)",
                    color: textColor,
                    "& .MuiChip-label": {
                      padding: "0 8px",
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{event.name}"? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventCard;
