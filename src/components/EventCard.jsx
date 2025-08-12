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
import { Edit, Delete, Repeat, CalendarMonth } from "@mui/icons-material";
import { calculateEventStats, formatTimeSince } from "../services/eventService";
import { GlobalContext } from "../context/GlobalContext";
import { formatDate } from "../utils/dateFormatter";
import { useTranslation } from 'react-i18next';

// Changed props: onEdit is now onOpenActionDialog, added onDirectEdit
const EventCard = ({ event, onOpenActionDialog, onDirectEdit, onDelete }) => { 
  // const navigate = useNavigate(); // No longer used directly for navigation
  const { events, config, calendarColors } = useContext(GlobalContext);
  const { i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Calcular estadísticas del evento usando la función del servicio
  const eventStats = calculateEventStats(event, events);

  // Helper function to format days into a readable string
  const formatDaysAgo = (days) => {
    if (days === null || days === undefined || isNaN(days)) return ""; // Handle null, undefined, or NaN
    if (days === 0) return "Hoy";
    if (days === 1) return "Hace 1 día";
    
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = Math.floor((days % 365) % 30);

    let resultParts = [];
    if (years > 0) {
      resultParts.push(`${years} ${years === 1 ? "año" : "años"}`);
    }
    if (months > 0) {
      resultParts.push(`${months} ${months === 1 ? "mes" : "meses"}`);
    }
    if (remainingDays > 0 || (years === 0 && months === 0 && days > 1) ) { // Show days if it's the only unit or if there are other units
      resultParts.push(`${remainingDays} ${remainingDays === 1 ? "día" : "días"}`);
    }
    
    if (resultParts.length === 0 && days > 1) { // Should only happen if days is > 1 and not 0 or 1
        resultParts.push(`${days} ${days === 1 ? "día" : "días"}`);
    }


    return `Hace ${resultParts.join(", ")}`;
  };


  const handleCardClick = (e) => {
    // Opens the action dialog if the click is not on a button
    if (!e.target.closest("button") && onOpenActionDialog) {
      onOpenActionDialog(event);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card click
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onDirectEdit) {
      onDirectEdit(event); // Call the new direct edit handler
    }
  };

  const handleConfirmDelete = () => {
    onDelete(event);
    setDeleteDialogOpen(false);
  };

  const customFormatDate = (date) => {
    return formatDate(date, config.dateFormat, i18n.language);
  };

  // Obtener el color del evento desde la API de Google Calendar
  const getEventColor = () => {
    if (!event.colorId || !calendarColors) {
      return null;
    }
    
    return calendarColors[event.colorId]?.background || null;
  };

  // Determinar si el color es claro u oscuro para ajustar el color del texto
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

  // Obtener el color de fondo del evento
  const backgroundColor = getEventColor();
  
  // Determinar el color del texto basado en el color de fondo y el modo oscuro
  const isDarkMode = config?.darkMode;
  
  // Colores para texto en modo claro
  const lightModeTextColor = backgroundColor ? 
    (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 
    'rgba(0, 0, 0, 0.87)';
  const lightModeSecondaryTextColor = backgroundColor ? 
    (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 
    'rgba(0, 0, 0, 0.6)';
  
  // Colores para texto en modo oscuro
  const darkModeTextColor = backgroundColor ? 
    (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 
    '#ffffff';
  const darkModeSecondaryTextColor = backgroundColor ? 
    (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 
    'rgba(255, 255, 255, 0.7)';
  
  // Seleccionar el conjunto de colores según el modo
  const textColor = isDarkMode ? darkModeTextColor : lightModeTextColor;
  const secondaryTextColor = isDarkMode ? darkModeSecondaryTextColor : lightModeSecondaryTextColor;

  // Determinar el color de fondo de la tarjeta
  const cardBackgroundColor = backgroundColor || (isDarkMode ? '#293548' : '#ffffff');
  
  // Determinar el color de los iconos
  const iconColor = textColor;

  return (
    <>
      <Card
        sx={{
          cursor: "pointer",
          // height: "100%", // Removed to allow variable height
          minHeight: 180, // MUI uses theme.spacing units by default if numbers are provided, otherwise specify 'px'
          maxHeight: 400, // Can be '400px' or a number for theme.spacing
          display: "flex",
          flexDirection: "column",
          backgroundColor: cardBackgroundColor,
          color: textColor,
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 6,
          },
        }}
        onClick={handleCardClick}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: "bold",
                color: textColor,
                flexGrow: 1,
                mr: 1,
              }}
            >
              {event.name}
            </Typography>
            <Box>
              <IconButton
                size="small"
                onClick={handleEditClick}
                sx={{ color: iconColor }}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleDeleteClick}
                sx={{ color: iconColor }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color={secondaryTextColor}
            sx={{ mb: 1, fontSize: "0.875rem" }}
          >
            <CalendarMonth
              fontSize="small"
              sx={{ verticalAlign: "middle", mr: 0.5, fontSize: "1rem" }}
            />
            {customFormatDate(event.startDate)}
          </Typography>

          {event.description && (
            <Typography
              variant="body2"
              color={secondaryTextColor}
              sx={{
                mb: 1.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {event.description}
            </Typography>
          )}

          {eventStats && (
            <Box sx={{ mt: 1 }}>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: "medium", color: textColor }}
              >
                {eventStats.isFirstOccurrence
                  ? `Hace ${formatTimeSince(eventStats)}`
                  : `Ocurrencia ${eventStats.occurrenceNumber} de ${eventStats.totalOccurrences}`}
              </Typography>

              {!eventStats.isFirstOccurrence && eventStats.totalOccurrences > 1 && eventStats.daysSinceLast !== undefined && (
                <Typography variant="caption" color={secondaryTextColor} sx={{ display: 'block', mt: 0.5 }}>
                  Última vez (serie): {formatDaysAgo(eventStats.daysSinceLast)}
                </Typography>
              )}

              {eventStats.averageGapDays && (
                <Typography variant="body2" color={secondaryTextColor}>
                  <Repeat
                    fontSize="small"
                    sx={{ verticalAlign: "middle", mr: 0.5, fontSize: "1rem" }}
                  />
                  Promedio: cada {eventStats.averageGapDays} días
                </Typography>
              )}

              {eventStats.daysSincePrevious && (
                <Typography variant="body2" color={secondaryTextColor}>
                  {eventStats.daysSincePrevious} días desde anterior
                </Typography>
              )}
            </Box>
          )}

          {event.tags && event.tags.length > 0 && (
            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {event.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    color: textColor,
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el evento "{event.name}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventCard;
