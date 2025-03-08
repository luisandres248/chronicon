import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { ChromePicker } from "react-color";

const EventForm = ({ open, onClose, onSubmit, event = null }) => {
  const [formData, setFormData] = useState({
    name: "",
    startDate: new Date(),
    description: "",
    color: "#ffffff",
    tags: [],
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (event) {
      console.log("Initializing form with event:", event);
      setFormData({
        name: event.name || "",
        startDate: event.startDate || new Date(),
        description: event.description || "",
        color: event.color || "#ffffff",
        tags: event.tags || [],
      });
    } else {
      setFormData({
        name: "",
        startDate: new Date(),
        description: "",
        color: "#ffffff",
        tags: [],
      });
    }
  }, [event, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    onSubmit(formData);
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

  const handleColorChange = (color) => {
    console.log("Color changed:", color);
    setFormData({ ...formData, color: color.hex });
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
            />

            <DateTimePicker
              label="Start Date"
              value={formData.startDate}
              onChange={(newValue) =>
                setFormData({ ...formData, startDate: newValue })
              }
              slotProps={{ textField: { fullWidth: true } }}
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
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color del evento
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    backgroundColor: formData.color || '#ffffff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <Button
                  variant="outlined"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  {showColorPicker ? "Cerrar selector" : "Elegir color"}
                </Button>
              </Box>
              {showColorPicker && (
                <Box sx={{ position: "relative", zIndex: 2, mt: 1 }}>
                  <ChromePicker
                    color={formData.color || '#ffffff'}
                    onChange={handleColorChange}
                    disableAlpha={true}
                  />
                </Box>
              )}
            </Box>

            <Box>
              <Autocomplete
                multiple
                value={formData.tags}
                onChange={(event, newValue) =>
                  setFormData({ ...formData, tags: newValue })
                }
                options={[]}
                freeSolo
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
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {event ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventForm;
