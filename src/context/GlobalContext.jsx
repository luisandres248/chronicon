import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as eventService from "../services/eventService";
import * as localDb from "../services/localDb";
import { exportEventsToJson } from "../services/importExportService";
import { isAutoBackupSupported, pickBackupDestination, writeBackupToDestination } from "../services/backupService";
import { isReminderSupported, syncScheduledReminders } from "../services/reminderService";
import logger from "../utils/logger.js";
import i18n from "../i18n";
import { normalizeDateFormat } from "../utils/dateFormatter";

export const GlobalContext = createContext();

const USER_CONFIG_STORAGE_KEY = "chronicon_user_config";
const AUTO_BACKUP_STORAGE_KEY = "chronicon_auto_backup";

const defaultConfig = {
  theme: "light",
  dateFormat: "yyyy/MM/dd",
  language: "en", // Add default language
};

const defaultAutoBackupConfig = {
  enabled: false,
  destinationUri: "",
  destinationLabel: "",
  lastBackupAt: null,
  lastBackupError: "",
};

export const GlobalProvider = ({ children }) => {
  const autoBackupTimerRef = useRef(null);
  const pendingBackupPayloadRef = useRef(null);
  const lastBackedUpPayloadRef = useRef(null);
  const autoBackupHydratedRef = useRef(false);

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
  const [autoBackupConfig, setAutoBackupConfig] = useState(() => {
    try {
      const storedConfig = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
      if (storedConfig) {
        return { ...defaultAutoBackupConfig, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      logger.error("Error loading autobackup config:", error);
    }
    return defaultAutoBackupConfig;
  });
  const [autoBackupRunning, setAutoBackupRunning] = useState(false);

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
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    if (!message) {
      return;
    }

    setToast({
      id: crypto.randomUUID(),
      message,
    });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const ensureUniqueOccurrenceDay = useCallback((eventSeriesId, occurrenceDate, excludedOccurrenceId = null) => {
    const seriesOccurrences = occurrences
      .filter((item) => item.eventSeriesId === eventSeriesId)
      .map((item) => ({
        id: item.id,
        startDate: item.occurrenceDate,
      }));

    if (eventService.hasOccurrenceOnSameDay(seriesOccurrences, occurrenceDate, excludedOccurrenceId)) {
      throw eventService.createDuplicateOccurrenceDayError();
    }
  }, [occurrences]);

  useEffect(() => {
    if (!toast?.id) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const derivedEvents = useMemo(
    () => eventService.buildOccurrenceEvents(eventSeries, occurrences),
    [eventSeries, occurrences]
  );
  const isNativeAutoBackupSupported = useMemo(() => isAutoBackupSupported(), []);
  const isNativeReminderSupported = useMemo(() => isReminderSupported(), []);
  const exportedEventsJson = useMemo(() => exportEventsToJson(derivedEvents), [derivedEvents]);

  const syncReminders = useCallback(async (nextSeries, nextOccurrences, options = {}) => {
    if (!isNativeReminderSupported) {
      return false;
    }

    try {
      return await syncScheduledReminders(nextSeries, nextOccurrences, options);
    } catch (reminderError) {
      logger.error("Failed to sync local reminders:", reminderError);
      return false;
    }
  }, [isNativeReminderSupported]);

  const persistAutoBackupConfig = useCallback((nextValue) => {
    setAutoBackupConfig((current) => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
      try {
        localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, JSON.stringify(resolved));
      } catch (error) {
        logger.error("Error saving autobackup config:", error);
      }
      return resolved;
    });
  }, []);

  const runAutoBackup = useCallback(async (payload = exportedEventsJson, destinationUri = autoBackupConfig.destinationUri) => {
    if (!isNativeAutoBackupSupported) {
      throw new Error(i18n.t("autoBackupUnsupported"));
    }

    if (!destinationUri) {
      throw new Error(i18n.t("autoBackupDestinationMissing"));
    }

    if (autoBackupTimerRef.current) {
      window.clearTimeout(autoBackupTimerRef.current);
      autoBackupTimerRef.current = null;
    }

    pendingBackupPayloadRef.current = payload;
    setAutoBackupRunning(true);

    try {
      await writeBackupToDestination(destinationUri, payload);
      const completedAt = new Date().toISOString();
      lastBackedUpPayloadRef.current = payload;
      pendingBackupPayloadRef.current = null;
      persistAutoBackupConfig((current) => ({
        ...current,
        lastBackupAt: completedAt,
        lastBackupError: "",
      }));
      return completedAt;
    } catch (error) {
      const message = error?.message || i18n.t("autoBackupWriteFailed");
      persistAutoBackupConfig((current) => ({
        ...current,
        lastBackupError: message,
      }));
      throw error;
    } finally {
      setAutoBackupRunning(false);
    }
  }, [autoBackupConfig.destinationUri, exportedEventsJson, isNativeAutoBackupSupported, persistAutoBackupConfig]);

  const chooseAutoBackupDestination = useCallback(async () => {
    if (!isNativeAutoBackupSupported) {
      throw new Error(i18n.t("autoBackupUnsupported"));
    }

    const result = await pickBackupDestination();
    persistAutoBackupConfig((current) => ({
      ...current,
      destinationUri: result.uri,
      destinationLabel: result.displayName || "chronicon-autobackup.json",
      lastBackupError: "",
    }));
    return result;
  }, [isNativeAutoBackupSupported, persistAutoBackupConfig]);

  const setAutoBackupEnabled = useCallback(async (enabled) => {
    if (!enabled) {
      persistAutoBackupConfig((current) => ({
        ...current,
        enabled: false,
      }));
      return false;
    }

    let destinationUri = autoBackupConfig.destinationUri;
    if (!destinationUri) {
      const result = await chooseAutoBackupDestination();
      destinationUri = result.uri;
    }

    persistAutoBackupConfig((current) => ({
      ...current,
      enabled: true,
      destinationUri: destinationUri || current.destinationUri,
    }));
    await runAutoBackup(exportedEventsJson, destinationUri || autoBackupConfig.destinationUri);
    return true;
  }, [autoBackupConfig.destinationUri, chooseAutoBackupDestination, exportedEventsJson, persistAutoBackupConfig, runAutoBackup]);

  const clearAutoBackupDestination = useCallback(() => {
    persistAutoBackupConfig((current) => ({
      ...current,
      enabled: false,
      destinationUri: "",
      destinationLabel: "",
      lastBackupAt: null,
      lastBackupError: "",
    }));
  }, [persistAutoBackupConfig]);

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

  useEffect(() => {
    if (appLoading) {
      return undefined;
    }

    if (!autoBackupHydratedRef.current) {
      autoBackupHydratedRef.current = true;
      lastBackedUpPayloadRef.current = exportedEventsJson;
      return undefined;
    }

    if (!isNativeAutoBackupSupported || !autoBackupConfig.enabled || !autoBackupConfig.destinationUri) {
      return undefined;
    }

    if (exportedEventsJson === lastBackedUpPayloadRef.current) {
      return undefined;
    }

    pendingBackupPayloadRef.current = exportedEventsJson;
    if (autoBackupTimerRef.current) {
      window.clearTimeout(autoBackupTimerRef.current);
    }

    autoBackupTimerRef.current = window.setTimeout(() => {
      runAutoBackup(pendingBackupPayloadRef.current).catch((backupError) => {
        logger.error("Automatic backup failed:", backupError);
      });
    }, 2500);

    return () => {
      if (autoBackupTimerRef.current) {
        window.clearTimeout(autoBackupTimerRef.current);
        autoBackupTimerRef.current = null;
      }
    };
  }, [
    appLoading,
    autoBackupConfig.destinationUri,
    autoBackupConfig.enabled,
    exportedEventsJson,
    isNativeAutoBackupSupported,
    runAutoBackup,
  ]);

  useEffect(() => {
    if (!isNativeAutoBackupSupported || !autoBackupConfig.enabled || !autoBackupConfig.destinationUri) {
      return undefined;
    }

    const flushPendingBackup = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }

      if (!pendingBackupPayloadRef.current || pendingBackupPayloadRef.current === lastBackedUpPayloadRef.current) {
        return;
      }

      runAutoBackup(pendingBackupPayloadRef.current).catch((backupError) => {
        logger.error("Automatic backup flush failed:", backupError);
      });
    };

    document.addEventListener("visibilitychange", flushPendingBackup);
    return () => document.removeEventListener("visibilitychange", flushPendingBackup);
  }, [autoBackupConfig.destinationUri, autoBackupConfig.enabled, isNativeAutoBackupSupported, runAutoBackup]);

  useEffect(() => {
    if (appLoading || !isNativeReminderSupported) {
      return undefined;
    }

    syncReminders(eventSeries, occurrences, { requestPermissions: false });
    return undefined;
  }, [appLoading, eventSeries, occurrences, isNativeReminderSupported, syncReminders]);

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
      const parsedSeries = eventService.parseEventSeriesRecord(seriesRecord);
      const parsedOccurrence = eventService.parseOccurrenceRecord(occurrenceRecord);
      await localDb.putEventSeries(seriesRecord);
      await localDb.putOccurrence(occurrenceRecord);
      const nextSeries = [...eventSeries, parsedSeries];
      const nextOccurrences = [...occurrences, parsedOccurrence];
      setEventSeries(nextSeries);
      setOccurrences(nextOccurrences);
      setError(null);
      if (eventService.hasEnabledReminders(parsedSeries.reminders)) {
        await syncReminders(nextSeries, nextOccurrences, { requestPermissions: true });
      }
      logger.info("Event created successfully:", seriesRecord);
      return true;
    } catch (err) {
      logger.error("Error creating event:", err);
      const message = err?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR ? err.message : i18n.t("createEventError");
      if (err?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR) {
        showToast(message);
      } else {
        setError(message);
      }
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, [eventSeries, occurrences, showToast, syncReminders]);

  const handleUpdateEvent = useCallback(async (eventId, formData) => {
    if (!eventId) throw new Error(i18n.t("missingEventId"));

    const originalSeries = eventSeries;
    const originalOccurrences = occurrences;
    const occurrenceToUpdate = occurrences.find((item) => item.id === eventId);

    if (!occurrenceToUpdate) {
      throw new Error(i18n.t("occurrenceNotFound"));
    }

    if (formData.eventType !== eventService.EVENT_TYPES.ONE_TIME) {
      try {
        ensureUniqueOccurrenceDay(occurrenceToUpdate.eventSeriesId, formData.startDate, occurrenceToUpdate.id);
      } catch (error) {
        const message = error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR ? error.message : i18n.t("updateEventError");
        if (error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR) {
          showToast(message);
        } else {
          setError(message);
        }
        throw new Error(message);
      }
    }

    const seriesOccurrences = occurrences.filter((item) => item.eventSeriesId === occurrenceToUpdate.eventSeriesId);
    const extraOccurrenceIds = formData.eventType === eventService.EVENT_TYPES.ONE_TIME
      ? seriesOccurrences.filter((item) => item.id !== occurrenceToUpdate.id).map((item) => item.id)
      : [];

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
    const nextSeries = originalSeries.map((item) => (item.id === parsedSeries.id ? parsedSeries : item));
    const nextOccurrences = originalOccurrences
      .filter((item) => !extraOccurrenceIds.includes(item.id))
      .map((item) => (item.id === parsedOccurrence.id ? parsedOccurrence : item));

    setEventSeries(nextSeries);
    setOccurrences(nextOccurrences);

    try {
      await localDb.putEventSeries(updatedSeriesRecord);
      await localDb.putOccurrence(updatedOccurrenceRecord);
      if (extraOccurrenceIds.length > 0) {
        await Promise.all(extraOccurrenceIds.map((occurrenceId) => localDb.deleteOccurrence(occurrenceId)));
      }
      setError(null);
      if (eventService.hasEnabledReminders(parsedSeries.reminders)) {
        await syncReminders(nextSeries, nextOccurrences, { requestPermissions: true });
      }
      return true;
    } catch (error) {
      setEventSeries(originalSeries);
      setOccurrences(originalOccurrences);
      const message = error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR ? error.message : i18n.t("updateEventError");
      if (error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR) {
        showToast(message);
      } else {
        setError(message);
      }
      logger.error("Rollback due to update error:", error);
      throw new Error(message);
    }
  }, [ensureUniqueOccurrenceDay, eventSeries, occurrences, showToast, syncReminders]);

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
      await syncReminders(nextSeries, nextOccurrences, { requestPermissions: false });
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
      const nextSeries = remainingForSeries.length === 0
        ? originalSeries.filter((item) => item.id !== targetOccurrence.eventSeriesId)
        : originalSeries;
      const nextOccurrences = originalOccurrences.filter((item) => item.id !== eventId);
      await syncReminders(nextSeries, nextOccurrences, { requestPermissions: false });
    } catch (error) {
      setEventSeries(originalSeries);
      setOccurrences(originalOccurrences);
      setError(i18n.t("deleteOccurrenceError"));
      logger.error("Rollback due to single occurrence delete error:", error);
    }
  }, [eventSeries, occurrences]);

  const handleUpdateOccurrenceDate = useCallback(async (occurrenceId, occurrenceDate) => {
    if (!occurrenceId) {
      throw new Error(i18n.t("missingEventId"));
    }

    const originalOccurrences = occurrences;
    const targetOccurrence = occurrences.find((item) => item.id === occurrenceId);

    if (!targetOccurrence) {
      throw new Error(i18n.t("occurrenceNotFound"));
    }

    try {
      ensureUniqueOccurrenceDay(targetOccurrence.eventSeriesId, occurrenceDate, occurrenceId);
    } catch (error) {
      const message = error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR ? error.message : i18n.t("updateEventError");
      if (error?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR) {
        showToast(message);
      } else {
        setError(message);
      }
      throw new Error(message);
    }

    const updatedOccurrenceRecord = eventService.createOccurrenceRecord({
      id: targetOccurrence.id,
      eventSeriesId: targetOccurrence.eventSeriesId,
      occurrenceDate,
      createdAt: targetOccurrence.createdAt,
    });
    const parsedOccurrence = eventService.parseOccurrenceRecord(updatedOccurrenceRecord);
    const nextOccurrences = originalOccurrences.map((item) => (item.id === occurrenceId ? parsedOccurrence : item));

    setOccurrences(nextOccurrences);

    try {
      await localDb.putOccurrence(updatedOccurrenceRecord);
      await syncReminders(eventSeries, nextOccurrences, { requestPermissions: false });
      setError(null);
      return true;
    } catch (error) {
      setOccurrences(originalOccurrences);
      setError(i18n.t("updateEventError"));
      logger.error("Rollback due to occurrence update error:", error);
      throw new Error(i18n.t("updateEventError"));
    }
  }, [ensureUniqueOccurrenceDay, eventSeries, occurrences, showToast, syncReminders]);

  const handleSaveRecurrence = useCallback(async (originalEvent, newDate) => {
    setProcessing(true);
    try {
      if (originalEvent?.eventType === eventService.EVENT_TYPES.ONE_TIME) {
        throw new Error(i18n.t("oneTimeEventRecurrenceDisabled"));
      }
      ensureUniqueOccurrenceDay(originalEvent.eventSeriesId, newDate);
      const occurrenceRecord = eventService.createOccurrenceRecord({
        eventSeriesId: originalEvent.eventSeriesId,
        occurrenceDate: newDate,
      });
      await localDb.putOccurrence(occurrenceRecord);
      const parsedOccurrence = eventService.parseOccurrenceRecord(occurrenceRecord);
      const nextOccurrences = [...occurrences, parsedOccurrence];
      setOccurrences(nextOccurrences);
      setError(null);
      await syncReminders(eventSeries, nextOccurrences, { requestPermissions: false });
      logger.info("Recurrence created successfully:", occurrenceRecord);
      return true;
    } catch (err) {
      logger.error("Error creating recurrence:", err);
      const message = err?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR ? err.message : i18n.t("createRecurrenceError");
      if (err?.code === eventService.DUPLICATE_OCCURRENCE_DAY_ERROR) {
        showToast(message);
      } else {
        setError(message);
      }
      throw new Error(message);
    }
    finally {
      setProcessing(false);
    }
  }, [ensureUniqueOccurrenceDay, eventSeries, occurrences, showToast, syncReminders]);

  const replaceAllEvents = useCallback(async (nextEvents) => {
    setProcessing(true);
    try {
      const converted = eventService.convertOccurrenceEventsToSeriesModel(nextEvents);
      await localDb.clearAllData();
      await localDb.bulkPutEventSeries(converted.eventSeries);
      await localDb.bulkPutOccurrences(converted.occurrences);
      const nextSeries = converted.eventSeries.map(eventService.parseEventSeriesRecord).filter(Boolean);
      const nextOccurrences = converted.occurrences.map(eventService.parseOccurrenceRecord).filter(Boolean);
      setEventSeries(nextSeries);
      setOccurrences(nextOccurrences);
      await syncReminders(nextSeries, nextOccurrences, { requestPermissions: false });
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
        derivedEvents.map(eventService.buildImportDedupKey)
      );
      const uniqueEvents = nextEvents.filter(
        (event) => !existingKeys.has(eventService.buildImportDedupKey(event))
      );
      if (uniqueEvents.length === 0) {
        return 0;
      }

      const converted = eventService.convertOccurrenceEventsToSeriesModel(uniqueEvents);
      await localDb.bulkPutEventSeries(converted.eventSeries);
      await localDb.bulkPutOccurrences(converted.occurrences);
      const parsedSeries = converted.eventSeries.map(eventService.parseEventSeriesRecord).filter(Boolean);
      const parsedOccurrences = converted.occurrences.map(eventService.parseOccurrenceRecord).filter(Boolean);
      const nextSeries = [...eventSeries, ...parsedSeries];
      const nextOccurrences = [...occurrences, ...parsedOccurrences];
      setEventSeries(nextSeries);
      setOccurrences(nextOccurrences);
      await syncReminders(nextSeries, nextOccurrences, { requestPermissions: false });
      return uniqueEvents.length;
    } catch (err) {
      logger.error("Error merging imported events:", err);
      setError(i18n.t("importEventsError"));
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [derivedEvents, eventSeries, occurrences, syncReminders]);

  const toggleEventPin = useCallback(async (eventId) => {
    if (!eventId) {
      throw new Error(i18n.t("missingEventId"));
    }

    const occurrence = occurrences.find((item) => item.id === eventId);
    if (!occurrence) {
      throw new Error(i18n.t("occurrenceNotFound"));
    }

    const targetSeries = eventSeries.find((item) => item.id === occurrence.eventSeriesId);
    if (!targetSeries) {
      throw new Error(i18n.t("occurrenceNotFound"));
    }

    const updatedSeriesRecord = eventService.createEventSeriesRecord({
      ...targetSeries,
      pinnedAt: targetSeries.pinnedAt ? null : new Date(),
      updatedAt: new Date(),
    });
    const parsedSeries = eventService.parseEventSeriesRecord(updatedSeriesRecord);
    const nextSeries = eventSeries.map((item) => (item.id === parsedSeries.id ? parsedSeries : item));

    setEventSeries(nextSeries);

    try {
      await localDb.putEventSeries(updatedSeriesRecord);
      setError(null);
      showToast(parsedSeries.pinnedAt ? i18n.t("eventPinned") : i18n.t("eventUnpinned"));
      return true;
    } catch (pinError) {
      setEventSeries(eventSeries);
      setError(i18n.t("updateEventError"));
      logger.error("Rollback due to pin toggle error:", pinError);
      throw new Error(i18n.t("updateEventError"));
    }
  }, [eventSeries, occurrences, showToast]);

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
    toast,
    autoBackupConfig,
    autoBackupRunning,
    isAutoBackupSupported: isNativeAutoBackupSupported,
    isReminderSupported: isNativeReminderSupported,
    // Methods
    updateConfig,
    chooseAutoBackupDestination,
    setAutoBackupEnabled,
    clearAutoBackupDestination,
    runAutoBackup,
    reloadEvents,
    replaceAllEvents,
    mergeImportedEvents,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDeleteSingleOccurrence,
    handleUpdateOccurrenceDate,
    handleSaveRecurrence,
    toggleEventPin,
    syncReminders,
    showToast,
    clearToast,
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
