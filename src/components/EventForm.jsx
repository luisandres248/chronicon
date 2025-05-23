import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Autocomplete,
  Chip,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { GlobalContext } from "../context/GlobalContext";
import logger from "../../utils/logger.js";

const EventForm = ({ open, onClose, onSubmit, event = null }) => {
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
      logger.log("Initializing form with event:", event);
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
    // Limpiar errores al abrir el formulario
    setErrors({});
    setSubmitting(false);
  }, [event, open]);

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombre
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "El nombre del evento es obligatorio";
    }
    
    // Validar fecha
    if (!formData.startDate || !(formData.startDate instanceof Date) || isNaN(formData.startDate.getTime())) {
      newErrors.startDate = "La fecha de inicio no es válida";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Process pending tagInput before validation or final object creation
    let currentTags = [...formData.tags];
    const trimmedTagInput = tagInput.trim();

    if (trimmedTagInput !== "" && !currentTags.includes(trimmedTagInput)) {
      // If there's text in input & not already in tags list, add it
      currentTags.push(trimmedTagInput);
      // Update formData.tags state so it's consistent for validation and UI
      // Also, clear the input field once the tag is processed.
      // This state update will make sure validateForm() sees the latest tags.
      setFormData(prevData => ({ ...prevData, tags: [...currentTags] }));
      setTagInput(""); 
    }
    
    setSubmitting(true);

    // Now, validateForm will use the potentially updated formData.tags
    if (!validateForm()) {
      setSubmitting(false);
      return;
    }
    
    // formData.tags should now be up-to-date.
    const cleanedFormData = {
      name: formData.name.trim(),
      startDate: formData.startDate,
      description: formData.description?.trim() || "",
      colorId: formData.colorId,
      tags: formData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0), 
    };
    
    logger.log("Submitting form data:", cleanedFormData);
    onSubmit(cleanedFormData);
    // Note: setSubmitting(false) is handled by the useEffect that depends on 'open'
    // which is generally fine as the form closes/resets.
  };

  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
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
    logger.log("Color ID changed:", colorId);
    setFormData({ ...formData, colorId });
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

            <DateTimePicker
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                    </Box>
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
              <Autocomplete
                multiple
                value={formData.tags}
                onChange={(event, newValue) =>
                  setFormData({ ...formData, tags: newValue })
                }
                options={[]}
                freeSolo
                disabled={submitting}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      onDelete={() => handleRemoveTag(option)}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Add tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                  />
                )}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {event ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventForm;
