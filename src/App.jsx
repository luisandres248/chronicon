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

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: config.darkMode ? "dark" : "light",
          primary: {
            main: "#2196f3",
          },
          secondary: {
            main: "#f50057",
          },
          ...(config.darkMode
            ? {
                background: {
                  default: "#334155", // Slate 700
                  paper: "#475569", // Slate 600
                },
                text: {
                  primary: "#f8fafc",
                  secondary: "#cbd5e1",
                },
              }
            : {
                background: {
                  default: "#f8fafc",
                  paper: "#ffffff",
                },
                text: {
                  primary: "#0f172a",
                  secondary: "#475569",
                },
              }),
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: config.darkMode ? "#0f172a" : "#1976d2",
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: config.darkMode ? "#0f172a" : "#ffffff",
              },
            },
          },
          MuiListItemIcon: {
            styleOverrides: {
              root: {
                color: config.darkMode ? "#60a5fa" : "inherit",
              },
            },
          },
          MuiListItemText: {
            styleOverrides: {
              primary: {
                color: config.darkMode ? "#f8fafc" : "inherit",
              },
            },
          },
        },
      }),
    [config.darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
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
