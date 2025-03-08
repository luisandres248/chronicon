"use client"
import { Typography, Button, Grid, Paper } from "@mui/material"
import { Add } from "@mui/icons-material"

const Home = () => {
  // Placeholder para eventos
  const events = [
    { id: 1, name: "Inicio del proyecto", lastOccurrence: new Date(), recurrences: 5 },
    { id: 2, name: "Último viaje a la playa", lastOccurrence: new Date(2023, 5, 15), recurrences: 1 },
  ]

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Eventos
      </Typography>
      <Button variant="contained" startIcon={<Add />} style={{ marginBottom: "20px" }}>
        Agregar Evento
      </Button>
      <Grid container spacing={3}>
        {events.map((event) => (
          <Grid item xs={12} sm={6} md={4} key={event.id}>
            <Paper elevation={3} style={{ padding: "20px", textAlign: "center" }}>
              <Typography variant="h6">{event.name}</Typography>
              <Typography variant="h3" style={{ margin: "20px 0" }}>
                {Math.floor((new Date() - event.lastOccurrence) / (1000 * 60 * 60 * 24))}
              </Typography>
              <Typography variant="subtitle1">días desde el último evento</Typography>
              <Typography variant="caption" style={{ position: "absolute", top: "10px", right: "10px" }}>
                {event.recurrences}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

export default Home

