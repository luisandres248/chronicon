import React, { createContext, useState, useEffect } from "react";
import {
  checkSignInStatus,
  initGoogleAPI,
  fetchCalendarEvents,
} from "../services/googleService";
import { parseGoogleEvent } from "../services/eventService";

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [config, setConfig] = useState({
    darkMode: false,
  });
  const [user, setUser] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    setConfig({ ...config, ...newConfig });
  };

  const addEvent = (event) => {
    const parsedEvent = parseGoogleEvent(event);
    if (parsedEvent) {
      setEvents((prevEvents) => [...prevEvents, parsedEvent]);
    } else {
      console.warn("Skipping invalid event:", event);
    }
  };

  const updateEvent = (updatedEvent) => {
    const parsedEvent = parseGoogleEvent(updatedEvent);
    if (parsedEvent) {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === parsedEvent.id ? parsedEvent : event
        )
      );
    } else {
      console.warn("Skipping invalid event update:", updatedEvent);
    }
  };

  const deleteEvent = (eventId) => {
    setEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );
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
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
