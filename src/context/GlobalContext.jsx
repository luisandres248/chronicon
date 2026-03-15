import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import * as eventService from "../services/eventService";
import * as localDb from "../services/localDb";
import logger from "../utils/logger.js";
import i18n from "../i18n";
import { normalizeDateFormat } from "../utils/dateFormatter";

export const GlobalContext = createContext();

const USER_CONFIG_STORAGE_KEY = "chronicon_user_config";

const defaultConfig = {
  theme: "light",
  dateFormat: "yyyy/MM/dd",
  language: "en", // Add default language
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
        if (!["light", "dark"].includes(parsedConfig.theme)) {
          parsedConfig.theme = "light";
        }
        parsedConfig.dateFormat = normalizeDateFormat(parsedConfig.dateFormat);
        delete parsedConfig.firstDayOfWeek;
        return { ...defaultConfig, ...parsedConfig };
      }
    } catch (error) {
      logger.error("Error loading user config:", error);
    }
    return defaultConfig;
  });

  // Core application state
  const [calendar] = useState({ id: "local-chronicon", summary: "Chronicon Offline" });
  const [eventSeries, setEventSeries] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [calendarColors] = useState(eventService.LOCAL_EVENT_COLORS);

  // Loading and error states
  const [appLoading, setAppLoading] = useState(true); // Initial app load
  const [eventsLoading, setEventsLoading] = useState(false); // Fetching events
  const [processing, setProcessing] = useState(false); // CUD operations
  const [error, setError] = useState(null);

  const derivedEvents = useMemo(
    () => eventService.buildOccurrenceEvents(eventSeries, occurrences),
    [eventSeries, occurrences]
  );

  const loadStructuredData = useCallback(async () => {
    const [storedSeries, storedOccurrences] = await Promise.all([
      localDb.getAllEventSeries(),
      localDb.getAllOccurrences(),
    ]);

    if (storedSeries.length === 0 && storedOccurrences.length === 0) {
      const legacyEvents = await localDb.getLegacyEvents();
      if (legacyEvents.length > 0) {
        const migrated = eventService.convertLegacyEventsToSeriesModel(legacyEvents);
        await localDb.bulkPutEventSeries(migrated.eventSeries);
        await localDb.bulkPutOccurrences(migrated.occurrences);
        setEventSeries(migrated.eventSeries.map(eventService.parseEventSeriesRecord).filter(Boolean));
        setOccurrences(migrated.occurrences.map(eventService.parseOccurrenceRecord).filter(Boolean));
        return;
      }
    }

    setEventSeries(storedSeries.map(eventService.parseEventSeriesRecord).filter(Boolean));
    setOccurrences(storedOccurrences.map(eventService.parseOccurrenceRecord).filter(Boolean));
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setAppLoading(true);
        await loadStructuredData();
      } catch (err) {
        logger.error("Error initializing offline store:", err);
        setError(i18n.t("initializeLocalStorageError"));
      } finally {
        setAppLoading(false);
      }
    };
    initializeApp();
  }, [loadStructuredData]);

  const reloadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      await loadStructuredData();
      logger.info("Events reloaded successfully.");
    } catch (err) {
      logger.error("Failed to reload events.", err);
      setError(i18n.t("reloadEventsError"));
    } finally {
      setEventsLoading(false);
    }
  }, [loadStructuredData]);

  const handleCreateEvent = useCallback(async (formData) => {
    setProcessing(true);
    try {
      const seriesRecord = eventService.createEventSeriesRecord(formData);
      const occurrenceRecord = eventService.createOccurrenceRecord({
        eventSeriesId: seriesRecord.id,
        occurrenceDate: formData.startDate,
      });
      await localDb.putEventSeries(seriesRecord);
      await localDb.putOccurrence(occurrenceRecord);
      setEventSeries((prev) => [...prev, eventService.parseEventSeriesRecord(seriesRecord)]);
      setOccurrences((prev) => [...prev, eventService.parseOccurrenceRecord(occurrenceRecord)]);
      logger.info("Event created successfully:", seriesRecord);
    } catch (err) {
      logger.error("Error creating event:", err);
      setError(i18n.t("createEventError"));
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleUpdateEvent = useCallback(async (eventId, formData) => {
    if (!eventId) throw new Error(i18n.t("missingEventId"));

    const originalSeries = eventSeries;
    const originalOccurrences = occurrences;
    const occurrenceToUpdate = occurrences.find((item) => item.id === eventId);

    if (!occurrenceToUpdate) {
      throw new Error(i18n.t("occurrenceNotFound"));
    }

    const updatedSeriesRecord = eventService.createEventSeriesRecord({
      ...eventSeries.find((item) => item.id === occurrenceToUpdate.eventSeriesId),
      ...formData,
      id: occurrenceToUpdate.eventSeriesId,
      updatedAt: new Date(),
    });
    const updatedOccurrenceRecord = eventService.createOccurrenceRecord({
      id: occurrenceToUpdate.id,
      eventSeriesId: occurrenceToUpdate.eventSeriesId,
      occurrenceDate: formData.startDate,
      createdAt: occurrenceToUpdate.createdAt,
    });

    const parsedSeries = eventService.parseEventSeriesRecord(updatedSeriesRecord);
    const parsedOccurrence = eventService.parseOccurrenceRecord(updatedOccurrenceRecord);

    setEventSeries((prev) => prev.map((item) => (item.id === parsedSeries.id ? parsedSeries : item)));
    setOccurrences((prev) => prev.map((item) => (item.id === parsedOccurrence.id ? parsedOccurrence : item)));

    try {
      await localDb.putEventSeries(updatedSeriesRecord);
      await localDb.putOccurrence(updatedOccurrenceRecord);
    } catch (error) {
      setEventSeries(originalSeries);
      setOccurrences(originalOccurrences);
      setError(i18n.t("updateEventError"));
      logger.error("Rollback due to update error:", error);
    }
  }, [eventSeries, occurrences]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    if (!eventId) throw new Error(i18n.t("missingEventId"));

    const occurrence = occurrences.find((item) => item.id === eventId);
    if (!occurrence) {
      return;
    }

    const originalSeries = eventSeries;
    const originalOccurrences = occurrences;
    const nextSeries = eventSeries.filter((item) => item.id !== occurrence.eventSeriesId);
    const nextOccurrences = occurrences.filter((item) => item.eventSeriesId !== occurrence.eventSeriesId);

    setEventSeries(nextSeries);
    setOccurrences(nextOccurrences);

    try {
      await localDb.deleteOccurrencesForSeries(occurrence.eventSeriesId);
      await localDb.deleteEventSeries(occurrence.eventSeriesId);
    } catch (error) {
      setEventSeries(originalSeries);
      setOccurrences(originalOccurrences);
      setError(i18n.t("deleteEventError"));
      logger.error("Rollback due to delete error:", error);
    }
  }, [eventSeries, occurrences]);
  
  const handleDeleteSingleOccurrence = useCallback(async (eventId) => {
    if (!eventId) throw new Error(i18n.t("missingEventId"));

    const originalSeries = eventSeries;
    const originalOccurrences = occurrences;
    const targetOccurrence = occurrences.find((item) => item.id === eventId);
    if (!targetOccurrence) return;

    const remainingForSeries = occurrences.filter((item) => item.eventSeriesId === targetOccurrence.eventSeriesId && item.id !== eventId);
    setOccurrences((prev) => prev.filter((item) => item.id !== eventId));
    if (remainingForSeries.length === 0) {
      setEventSeries((prev) => prev.filter((item) => item.id !== targetOccurrence.eventSeriesId));
    }

    try {
      await localDb.deleteOccurrence(eventId);
      if (remainingForSeries.length === 0) {
        await localDb.deleteEventSeries(targetOccurrence.eventSeriesId);
      }
    } catch (error) {
      setEventSeries(originalSeries);
      setOccurrences(originalOccurrences);
      setError(i18n.t("deleteOccurrenceError"));
      logger.error("Rollback due to single occurrence delete error:", error);
    }
  }, [eventSeries, occurrences]);

  const handleSaveRecurrence = useCallback(async (originalEvent, newDate) => {
    setProcessing(true);
    try {
      const occurrenceRecord = eventService.createOccurrenceRecord({
        eventSeriesId: originalEvent.eventSeriesId,
        occurrenceDate: newDate,
      });
      await localDb.putOccurrence(occurrenceRecord);
      setOccurrences((prev) => [...prev, eventService.parseOccurrenceRecord(occurrenceRecord)]);
      logger.info("Recurrence created successfully:", occurrenceRecord);
    } catch (err) {
      logger.error("Error creating recurrence:", err);
      setError(i18n.t("createRecurrenceError"));
    }
    finally {
      setProcessing(false);
    }
  }, []);

  const replaceAllEvents = useCallback(async (nextEvents) => {
    setProcessing(true);
    try {
      const converted = eventService.convertOccurrenceEventsToSeriesModel(nextEvents);
      await localDb.clearAllData();
      await localDb.bulkPutEventSeries(converted.eventSeries);
      await localDb.bulkPutOccurrences(converted.occurrences);
      setEventSeries(converted.eventSeries.map(eventService.parseEventSeriesRecord).filter(Boolean));
      setOccurrences(converted.occurrences.map(eventService.parseOccurrenceRecord).filter(Boolean));
    } catch (err) {
      logger.error("Error replacing events:", err);
      setError(i18n.t("replaceLocalEventsError"));
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const mergeImportedEvents = useCallback(async (nextEvents) => {
    setProcessing(true);
    try {
      const existingKeys = new Set(
        derivedEvents.map((event) => `${event.name}__${event.startDate.toISOString().slice(0, 10)}`)
      );
      const uniqueEvents = nextEvents.filter(
        (event) => !existingKeys.has(`${event.name}__${event.startDate.toISOString().slice(0, 10)}`)
      );
      if (uniqueEvents.length === 0) {
        return 0;
      }

      const converted = eventService.convertOccurrenceEventsToSeriesModel(uniqueEvents);
      await localDb.bulkPutEventSeries(converted.eventSeries);
      await localDb.bulkPutOccurrences(converted.occurrences);
      setEventSeries((prev) => [...prev, ...converted.eventSeries.map(eventService.parseEventSeriesRecord).filter(Boolean)]);
      setOccurrences((prev) => [...prev, ...converted.occurrences.map(eventService.parseOccurrenceRecord).filter(Boolean)]);
      return uniqueEvents.length;
    } catch (err) {
      logger.error("Error merging imported events:", err);
      setError(i18n.t("importEventsError"));
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [derivedEvents]);

  // --- CONFIGURATION MANAGEMENT ---
  const updateConfig = (newConfig) => {
    const updatedConfig = {
      ...config,
      ...newConfig,
      dateFormat: normalizeDateFormat(newConfig.dateFormat ?? config.dateFormat),
    };
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
    calendar,
    events: derivedEvents,
    eventSeries,
    occurrences,
    calendarColors,
    appLoading,
    eventsLoading,
    processing,
    error,
    // Methods
    updateConfig,
    reloadEvents,
    replaceAllEvents,
    mergeImportedEvents,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDeleteSingleOccurrence,
    handleSaveRecurrence,
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
