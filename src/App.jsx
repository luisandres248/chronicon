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
import { Snackbar, Alert } from "@mui/material";
import { useState } from "react";

function AppContent() {
  const { config, user, setUser, setCalendar } = useContext(GlobalContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [authMessage, setAuthMessage] = useState(null);

  const lightTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#1976d2", // Default MUI blue
          },
          secondary: {
            main: "#dc004e", // Default MUI pink
          },
          background: {
            default: "#f8fafc", // A light gray
            paper: "#ffffff",
          },
          text: {
            primary: "#0f172a", // Dark slate for primary text
            secondary: "#475569", // Lighter slate for secondary text
          },
        },
      }),
    []
  );

  const darkTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          primary: {
            main: "#90caf9", // Lighter blue for dark mode
          },
          secondary: {
            main: "#f48fb1", // Lighter pink for dark mode
          },
          background: {
            default: "#121212", // Standard dark background
            paper: "#1e1e1e", // Slightly lighter for surfaces in dark mode
          },
        },
      }),
    []
  );

  const chroniconTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark", // Base it on dark mode
          primary: {
            main: "#78909C", // Grayish blue (blueGrey[400])
          },
          secondary: {
            main: "#A1887F", // Grayish Brown (brown[300]) for secondary if needed
          },
          background: {
            default: "#2F4F4F", // Dark slate gray
            paper: "#424242", // Slightly lighter gray for surfaces
          },
          text: {
            primary: "#E0E0E0", // Light gray for primary text for contrast
            secondary: "#BDBDBD", // Slightly darker light gray for secondary text
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: "#263238", // Darker shade for AppBar in softDark
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: "#2F4F4F", // Matching drawer with background
              },
            },
          },
        },
      }),
    []
  );

  const selectedTheme = useMemo(() => {
    if (config.theme === "light") return lightTheme;
    if (config.theme === "dark") return darkTheme;
    if (config.theme === "chronicon") return chroniconTheme;
    return chroniconTheme; // Default to chronicon if theme is somehow unset
  }, [config.theme, lightTheme, darkTheme, chroniconTheme]);

  // Cleanup old component overrides that were dependent on darkMode
  // Specific component overrides can be added to each theme definition if needed.
  // For example, MuiAppBar, MuiDrawer, MuiListItemIcon, MuiListItemText

  return (
    <ThemeProvider theme={selectedTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
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
    </ThemeProvider>
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
