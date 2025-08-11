import React, { createContext, useState, useEffect, useCallback } from "react";
import * as googleService from "../services/googleService";
import * as eventService from "../services/eventService";
import logger from "../utils/logger.js";

export const GlobalContext = createContext();

const USER_CONFIG_STORAGE_KEY = "chronicon_user_config";

const defaultConfig = {
  theme: "softDark",
};

export const GlobalProvider = ({ children }) => {
  // Configuration state
  const [config, setConfig] = useState(() => {
    try {
      const storedConfig = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        if (parsedConfig.hasOwnProperty('darkMode')) {
          parsedConfig.theme = parsedConfig.darkMode ? 'dark' : 'light';
          delete parsedConfig.darkMode;
        }
        delete parsedConfig.firstDayOfWeek;
        return { ...defaultConfig, ...parsedConfig };
      }
    } catch (error) {
      logger.error("Error loading user config:", error);
    }
    return defaultConfig;
  });

  // Core application state
  const [user, setUser] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [calendarColors, setCalendarColors] = useState(null);

  // Loading and error states
  const [appLoading, setAppLoading] = useState(true); // Initial app load
  const [authLoading, setAuthLoading] = useState(false); // Signing in/out
  const [eventsLoading, setEventsLoading] = useState(false); // Fetching events
  const [processing, setProcessing] = useState(false); // CUD operations
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(null);

  // --- CORE APP INITIALIZATION ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setAppLoading(true);
        await googleService.initGoogleAPI();
        const { profile, calendar } = googleService.checkSignInStatus();
        if (profile && calendar) {
          logger.info("Restoring session:", { profile, calendar });
          setUser(profile);
          setCalendar(calendar);
        } else {
          logger.info("No stored session found");
        }
      } catch (err) {
        logger.error("Error initializing Google API:", err);
        setError("Failed to initialize Google API. Please refresh the page.");
      } finally {
        setAppLoading(false);
      }
    };
    initializeApp();
  }, []);

  // --- DATA FETCHING EFFECTS ---
  useEffect(() => {
    const loadData = async () => {
      if (user && calendar) {
        setEventsLoading(true);
        setError(null);
        try {
          const [colors, calendarEvents] = await Promise.all([
            googleService.getCalendarColors(),
            googleService.fetchCalendarEvents(calendar.id),
          ]);
          if (colors?.event) setCalendarColors(colors.event);
          const parsedEvents = calendarEvents.map(eventService.parseGoogleEvent).filter(Boolean);
          setEvents(parsedEvents);
          logger.info("Loaded calendar colors:", colors?.event);
          logger.info("Raw calendar events:", calendarEvents);
          logger.info("Parsed events:", parsedEvents);
        } catch (err) {
          logger.error("Error loading events:", err);
          setError("Failed to load calendar data. Your session might have expired.");
          setEvents([]);
        } finally {
          setEventsLoading(false);
        }
      } else {
        logger.info("Not loading events - missing calendar or user", {
          calendarId: calendar?.id,
          hasUser: !!user,
        });
        setEvents([]);
      }
    };
    loadData();
  }, [user, calendar]);

  // --- BUSINESS LOGIC & API CALLS ---

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { userProfile, calendar } = await googleService.signIn();
      setUser(userProfile);
      setCalendar(calendar);
    } catch (err) {
      if (err?.error !== "popup_closed_by_user") {
        logger.error("Error signing in:", err);
        setAuthError(err.message || "An unknown error occurred during sign-in.");
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthLoading(true);
    await googleService.signOut();
    setUser(null);
    setCalendar(null);
    setEvents([]);
    setAuthLoading(false);
  }, []);

  const reloadEvents = useCallback(async () => {
    if (!calendar?.id) return;
    setEventsLoading(true);
    try {
      const calendarEvents = await googleService.fetchCalendarEvents(calendar.id);
      const parsedEvents = calendarEvents.map(eventService.parseGoogleEvent).filter(Boolean);
      setEvents(parsedEvents);
      logger.info("Events reloaded successfully.");
    } catch (err) {
      logger.error("Failed to reload events.", err);
      setError("Failed to reload events.");
    } finally {
      setEventsLoading(false);
    }
  }, [calendar]);

  const handleCreateEvent = useCallback(async (formData) => {
    if (!calendar?.id) throw new Error("No calendar selected");
    setProcessing(true);
    try {
      const eventObject = eventService.createEventObject(formData);
      const newEvent = await googleService.createEvent(calendar.id, eventObject);
      const parsedEvent = eventService.parseGoogleEvent(newEvent);
      setEvents(prev => [...prev, parsedEvent]);
      logger.info("Event created successfully:", parsedEvent);
    } catch (err) {
      logger.error("Error creating event:", err);
      setError("Failed to create event.");
    } finally {
      setProcessing(false);
    }
  }, [calendar]);

  const handleUpdateEvent = useCallback(async (eventId, formData) => {
    if (!calendar?.id || !eventId) throw new Error("Missing calendar or event ID");

    const originalEvents = events;
    const updatedEventObject = eventService.createEventObject({ ...formData, id: eventId });
    const parsedEvent = eventService.parseGoogleEvent(updatedEventObject); // Parse local object to keep UI consistent

    // Optimistic update
    setEvents(prev => prev.map(e => e.id === eventId ? parsedEvent : e));
    logger.info("Optimistically updated event:", parsedEvent);

    try {
      await googleService.updateEvent(calendar.id, eventId, updatedEventObject);
      logger.info("Event update confirmed by API.");
    } catch (error) {
      // Rollback on error
      setEvents(originalEvents);
      setError("Failed to update event. Please try again."); // Set error for UI feedback
      logger.error("Rollback due to update error:", error);
    }
  }, [calendar, events]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    if (!calendar?.id || !eventId) throw new Error("Missing calendar or event ID");

    const originalEvents = events;

    // Optimistic update
    setEvents(prev => prev.filter(e => e.id !== eventId));
    logger.info("Optimistically deleted event with ID:", eventId);

    try {
      await googleService.deleteEvent(calendar.id, eventId);
      logger.info("Event deletion confirmed by API.");
    } catch (error) {
      // Rollback on error
      setEvents(originalEvents);
      setError("Failed to delete event. Please try again."); // Set error for UI feedback
      logger.error("Rollback due to delete error:", error);
    }
  }, [calendar, events]);
  
  const handleSaveRecurrence = useCallback(async (originalEvent, newDate) => {
    if (!calendar?.id) throw new Error("No calendar selected");
    setProcessing(true);
    try {
      const recurrenceEventObject = eventService.createEventObject({
        name: originalEvent.name, description: originalEvent.description || "",
        colorId: originalEvent.colorId || null, tags: originalEvent.tags || [],
        startDate: newDate,
      });
      const createdCalendarEvent = await googleService.createEvent(calendar.id, recurrenceEventObject);
      const parsedEvent = eventService.parseGoogleEvent(createdCalendarEvent);
      setEvents(prev => [...prev, parsedEvent]);
      logger.info("Recurrence created successfully:", parsedEvent);
    } catch (err) {
      logger.error("Error creating recurrence:", err);
      setError("Failed to create recurrence.");
    }
    finally {
      setProcessing(false);
    }
  }, [calendar]);

  // --- CONFIGURATION MANAGEMENT ---
  const updateConfig = (newConfig) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    try {
      localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
    } catch (error) {
      logger.error("Error saving user config to localStorage:", error);
    }
  };

  const value = {
    // State
    config,
    user,
    calendar,
    events,
    calendarColors,
    appLoading,
    authLoading,
    eventsLoading,
    processing,
    error,
    authError,
    // Methods
    updateConfig,
    handleSignIn,
    handleSignOut,
    reloadEvents,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleSaveRecurrence,
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};