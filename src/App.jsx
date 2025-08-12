import React, { useContext, useMemo, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { GlobalContext, GlobalProvider } from "./context/GlobalContext";
import Sidebar from "./components/Sidebar";
import Config from "./pages/Config";
import EventsGrid from "./components/EventsGrid";
import EventCalendar from "./components/EventCalendar";
import ImportEventsPage from "./pages/ImportEventsPage";
import { Snackbar, Alert } from "@mui/material";
import { useState } from "react";

function AppContent() {
  const { config, user, setUser, setCalendar } = useContext(GlobalContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [authMessage, setAuthMessage] = useState(null);

  // Cleanup old component overrides that were dependent on darkMode
  // Specific component overrides can be added to each theme definition if needed.
  // For example, MuiAppBar, MuiDrawer, MuiListItemIcon, MuiListItemText

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main
          style={{
            flexGrow: 1,
            padding: "20px",
            width: "100%",
            overflow: "auto",
          }}
        >
          <Routes>
            <Route path="/" element={<EventsGrid />} />
            <Route path="/calendar" element={<EventCalendar />} />
            <Route path="/config" element={<Config />} />
            <Route path="/import" element={<ImportEventsPage />} />
          </Routes>
        </main>
      </div>

      {/* Snackbar para mensajes de autenticación */}
      <Snackbar
        open={!!authMessage}
        autoHideDuration={6000}
        onClose={() => setAuthMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {authMessage && (
          <Alert
            onClose={() => setAuthMessage(null)}
            severity={authMessage.type}
            variant="filled"
          >
            {authMessage.text}
          </Alert>
        )}
      </Snackbar>
    </LocalizationProvider>
  );
}

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;
