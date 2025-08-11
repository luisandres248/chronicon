import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

const SortingControls = ({ sortCriteria, setSortCriteria, sortOrder, setSortOrder }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 220, mr: 1 }}>
        <InputLabel>Ordenar por</InputLabel>
        <Select
          value={sortCriteria}
          label="Ordenar por"
          onChange={(e) => setSortCriteria(e.target.value)}
        >
          <MenuItem value="startDate">Fecha de inicio</MenuItem>
          <MenuItem value="lastRecurrence">Última recurrencia</MenuItem>
          <MenuItem value="name">Nombre</MenuItem>
          <MenuItem value="recurrenceCount">Cantidad de recurrencias</MenuItem>
        </Select>
      </FormControl>
      <IconButton onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
        {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
      </IconButton>
    </Box>
  );
};

export default SortingControls;
