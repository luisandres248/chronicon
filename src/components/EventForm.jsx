import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { GlobalContext } from "../context/GlobalContext";
import logger from "../utils/logger.js";

const EventForm = ({ open, onClose, onSubmit, event = null, onDelete }) => {
  const { calendarColors, loadingColors } = useContext(GlobalContext);
  const [formData, setFormData] = useState({
    name: "",
    startDate: new Date(),
    description: "",
    colorId: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      logger.debug("Initializing form with event:", event);
      setFormData({
        name: event.name || "",
        startDate: event.startDate || new Date(),
        description: event.description || "",
        colorId: event.colorId || null,
        tags: event.tags || [],
      });
    } else {
      setFormData({
        name: "",
        startDate: new Date(),
        description: "",
        colorId: null,
        tags: [],
      });
    }
    setErrors({});
    setSubmitting(false);
  }, [event, open]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "El nombre del evento es obligatorio";
    }
    if (!formData.startDate || !(formData.startDate instanceof Date) || isNaN(formData.startDate.getTime())) {
      newErrors.startDate = "La fecha de inicio no es válida";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let currentTags = [...formData.tags];
    const trimmedTagInput = tagInput.trim();

    if (trimmedTagInput !== "" && !currentTags.includes(trimmedTagInput)) {
      currentTags.push(trimmedTagInput);
      setFormData(prevData => ({ ...prevData, tags: [...currentTags] }));
      setTagInput(""); 
    }
    
    setSubmitting(true);
    if (!validateForm()) {
      setSubmitting(false);
      return;
    }
    
    const cleanedFormData = {
      name: formData.name.trim(),
      startDate: formData.startDate,
      description: formData.description?.trim() || "",
      colorId: formData.colorId,
      tags: formData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0), 
    };
    
    logger.info("Submitting form data:", cleanedFormData);
    onSubmit(cleanedFormData);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, trimmedTag],
      });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleColorChange = (colorId) => {
    logger.debug("Color ID changed:", colorId);
    setFormData({ ...formData, colorId });
  };

  const handleDelete = () => {
    if (event && window.confirm(`¿Estás seguro de que quieres eliminar el evento "${event.name}"?`)) {
      if (onDelete) {
        onDelete(event.id); // Pass event.id to the onDelete handler
      }
      onClose(); // Close the form
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Event Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              fullWidth
              error={!!errors.name}
              helperText={errors.name}
              disabled={submitting}
            />

            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={(newValue) =>
                setFormData({ ...formData, startDate: newValue })
              }
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  error: !!errors.startDate,
                  helperText: errors.startDate
                } 
              }}
              disabled={submitting}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={4}
              fullWidth
              disabled={submitting}
            />

            <FormControl fullWidth disabled={submitting || loadingColors}>
              <InputLabel id="event-color-label">Color del evento</InputLabel>
              <Select
                labelId="event-color-label"
                value={formData.colorId || ""}
                onChange={(e) => handleColorChange(e.target.value || null)}
                label="Color del evento"
              >
                <MenuItem value="">
                  <em>Predeterminado</em>
                </MenuItem>
                {calendarColors && Object.entries(calendarColors).map(([id, colorData]) => (
                  <MenuItem key={id} value={id}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        backgroundColor: colorData.background,
                        border: `1px solid ${colorData.foreground}`,
                        borderRadius: '4px'
                      }}
                    />
                    <span>Color {id}</span>
                  </MenuItem>
                ))}
              </Select>
              {loadingColors && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
            </FormControl>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    disabled={submitting}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  fullWidth
                  disabled={submitting}
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddTag}
                  disabled={submitting || !tagInput.trim()}
                >
                  Add Tag
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: '16px 24px' }}>
          <Box>
            {event && onDelete && ( // Conditionally render Delete button
              <Button 
                onClick={handleDelete} 
                color="error" 
                disabled={submitting}
                variant="outlined"
              >
                Eliminar
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={onClose} disabled={submitting} sx={{ mr: 1 }}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={submitting}
            >
              {event ? "Update" : "Create"}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventForm;