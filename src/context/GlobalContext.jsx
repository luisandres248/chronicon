import React, { createContext, useState, useEffect } from "react";
import {
  checkSignInStatus,
  initGoogleAPI,
  fetchCalendarEvents,
  getCalendarColors,
} from "../services/googleService";
import { parseGoogleEvent } from "../services/eventService";

export const GlobalContext = createContext();

const USER_CONFIG_STORAGE_KEY = "chronicon_user_config";

const defaultConfig = {
  theme: "softDark", // Changed from darkMode: false
};

export const GlobalProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    try {
      const storedConfig = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        // Ensure backward compatibility or migration if 'darkMode' exists
        if (parsedConfig.hasOwnProperty('darkMode')) {
          parsedConfig.theme = parsedConfig.darkMode ? 'dark' : 'light';
          delete parsedConfig.darkMode; // Remove old key
        }
        delete parsedConfig.firstDayOfWeek; // Explicitly remove it
        return { ...defaultConfig, ...parsedConfig };
      }
    } catch (error) {
      console.error("Error loading user config from localStorage:", error);
    }
    return defaultConfig;
  });
  const [user, setUser] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarColors, setCalendarColors] = useState(null);
  const [loadingColors, setLoadingColors] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        await initGoogleAPI();
        const { profile, calendar } = checkSignInStatus();

        if (profile && calendar) {
          console.log("Restoring session:", { profile, calendar });
          setUser(profile);
          setCalendar(calendar);
        } else {
          console.log("No stored session found");
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        setError("Failed to initialize Google API");
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Cargar colores disponibles cuando el usuario está autenticado
  useEffect(() => {
    const loadColors = async () => {
      if (!user) return;
      
      try {
        setLoadingColors(true);
        const colors = await getCalendarColors();
        if (colors && colors.event) {
          console.log("Loaded calendar colors:", colors.event);
          setCalendarColors(colors.event);
        }
      } catch (error) {
        console.error("Error loading calendar colors:", error);
      } finally {
        setLoadingColors(false);
      }
    };

    loadColors();
  }, [user]);

  useEffect(() => {
    const loadEvents = async () => {
      if (calendar?.id && user) {
        try {
          setLoading(true);
          setError(null);
          console.log("Loading events for calendar:", calendar.id);
          const calendarEvents = await fetchCalendarEvents(calendar.id);
          console.log("Raw calendar events:", calendarEvents);
          const parsedEvents = calendarEvents
            .map(parseGoogleEvent)
            .filter(Boolean);
          console.log("Parsed events:", parsedEvents);
          setEvents(parsedEvents);
        } catch (error) {
          console.error("Error loading events:", error);
          
          // Determinar el tipo de error para mostrar un mensaje más amigable
          let errorMessage = "Failed to load calendar events";
          
          // Errores de autenticación
          if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
            errorMessage = "Your session has expired. Please sign out and sign in again.";
          } 
          // Errores de red
          else if (error.message && error.message.includes("network")) {
            errorMessage = "Network error. Please check your internet connection.";
          }
          // Errores de acceso
          else if (error.status === 403 || (error.result && error.result.error && error.result.error.code === 403)) {
            errorMessage = "You don't have permission to access this calendar.";
          }
          // Errores de límite de cuota
          else if (error.status === 429 || (error.result && error.result.error && error.result.error.code === 429)) {
            errorMessage = "Too many requests. Please try again later.";
          }
          
          setError(errorMessage);
          setEvents([]);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Not loading events - missing calendar or user", {
          calendarId: calendar?.id,
          hasUser: !!user,
        });
        setEvents([]);
      }
    };

    loadEvents();
  }, [calendar, user]);

  const updateConfig = (newConfig) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    try {
      localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
    } catch (error) {
      console.error("Error saving user config to localStorage:", error);
    }
  };

  const addEvent = (event) => {
    const parsedEvent = parseGoogleEvent(event);
    if (parsedEvent) {
      console.log("Adding event to state:", parsedEvent);
      setEvents((prevEvents) => {
        // Verificar si el evento ya existe para evitar duplicados
        const exists = prevEvents.some(e => e.id === parsedEvent.id);
        if (exists) {
          console.log("Event already exists, updating instead:", parsedEvent.id);
          return prevEvents.map(e => e.id === parsedEvent.id ? parsedEvent : e);
        }
        return [...prevEvents, parsedEvent];
      });
    } else {
      console.warn("Skipping invalid event:", event);
    }
  };

  const updateEvent = (updatedEvent) => {
    const parsedEvent = parseGoogleEvent(updatedEvent);
    if (parsedEvent) {
      console.log("Updating event in state:", parsedEvent);
      setEvents((prevEvents) => {
        // Verificar si el evento existe
        const exists = prevEvents.some(e => e.id === parsedEvent.id);
        if (!exists) {
          console.log("Event doesn't exist, adding instead:", parsedEvent.id);
          return [...prevEvents, parsedEvent];
        }
        return prevEvents.map((event) =>
          event.id === parsedEvent.id ? parsedEvent : event
        );
      });
    } else {
      console.warn("Skipping invalid event update:", updatedEvent);
    }
  };

  const deleteEvent = (eventId) => {
    console.log("Deleting event from state:", eventId);
    setEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );
  };

  // Función para reemplazar todos los eventos
  const setAllEvents = (newEvents) => {
    if (!newEvents || !Array.isArray(newEvents)) {
      console.warn("Invalid events array:", newEvents);
      return;
    }
    
    console.log(`Setting all events (${newEvents.length})`);
    const parsedEvents = newEvents
      .map(parseGoogleEvent)
      .filter(Boolean);
    
    setEvents(parsedEvents);
  };

  return (
    <GlobalContext.Provider
      value={{
        config,
        updateConfig,
        user,
        setUser,
        calendar,
        setCalendar,
        events,
        loading,
        error,
        addEvent,
        updateEvent,
        deleteEvent,
        setAllEvents,
        calendarColors,
        loadingColors,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
