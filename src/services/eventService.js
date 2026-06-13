import { differenceInDays, differenceInMonths, differenceInYears, startOfDay } from "date-fns";
import i18n from "../i18n";

const DEFAULT_EVENT_DURATION = 60; // minutes
export const DUPLICATE_OCCURRENCE_DAY_ERROR = "DUPLICATE_OCCURRENCE_DAY";
export const EVENT_TYPES = {
  ONE_TIME: "one_time",
  SERIES: "series",
};
export const REMINDER_KINDS = {
  ANNIVERSARY: "anniversary",
  INTERVAL: "interval",
  ONE_TIME: "one_time",
};
export const REMINDER_ANCHORS = {
  FIRST: "first_occurrence",
  LAST: "last_occurrence",
};
export const REMINDER_UNITS = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
  YEARS: "years",
};
export const DEFAULT_REMINDER_TIME = "09:00";

export const LOCAL_EVENT_COLORS = {
  1: { background: "#A33E3E", foreground: "#FFFFFF" },
  2: { background: "#C55454", foreground: "#FFFFFF" },
  3: { background: "#E27A7A", foreground: "#1C1A17" },
  4: { background: "#A85A2A", foreground: "#FFFFFF" },
  5: { background: "#C87436", foreground: "#FFFFFF" },
  6: { background: "#E39A5C", foreground: "#1C1A17" },
  7: { background: "#9A7A1F", foreground: "#FFFFFF" },
  8: { background: "#C29A2E", foreground: "#1C1A17" },
  9: { background: "#E0BE58", foreground: "#1C1A17" },
  10: { background: "#4E7648", foreground: "#FFFFFF" },
  11: { background: "#5F9158", foreground: "#FFFFFF" },
  12: { background: "#79B06F", foreground: "#1C1A17" },
  13: { background: "#29628B", foreground: "#FFFFFF" },
  14: { background: "#5D8AAD", foreground: "#FFFFFF" },
  15: { background: "#7F97AB", foreground: "#1C1A17" },
  16: { background: "#5C4E8A", foreground: "#FFFFFF" },
  17: { background: "#7562A8", foreground: "#FFFFFF" },
  18: { background: "#9788C6", foreground: "#1C1A17" },
  19: { background: "#B53E52", foreground: "#FFFFFF" },
  20: { background: "#D96A7F", foreground: "#1C1A17" },
  21: { background: "#9C4A2F", foreground: "#FFFFFF" },
  22: { background: "#C46D3B", foreground: "#FFFFFF" },
  23: { background: "#E3A24F", foreground: "#1C1A17" },
  24: { background: "#B5A12A", foreground: "#1C1A17" },
  25: { background: "#7F9932", foreground: "#1C1A17" },
  26: { background: "#4D8A57", foreground: "#FFFFFF" },
  27: { background: "#2F8C78", foreground: "#FFFFFF" },
  28: { background: "#2B8FA3", foreground: "#FFFFFF" },
  29: { background: "#2F6FA8", foreground: "#FFFFFF" },
  30: { background: "#3C5FA8", foreground: "#FFFFFF" },
  31: { background: "#6B5CB8", foreground: "#FFFFFF" },
  32: { background: "#8B5BAF", foreground: "#FFFFFF" },
  33: { background: "#A45A8B", foreground: "#FFFFFF" },
  34: { background: "#7A614F", foreground: "#FFFFFF" },
  35: { background: "#5E7288", foreground: "#FFFFFF" },
  36: { background: "#8598AC", foreground: "#1C1A17" },
};

export const createEventObject = ({
  id,
  name,
  startDate,
  description = "",
  colorId = null,
  tags = [],
}) => {
  let start = startDate;
  if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
    start = new Date();
  }

  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const eventObject = {
    summary: name || i18n.t("untitledEvent"),
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    description: description || "",
  };

  if (tags && tags.length > 0) {
    eventObject.extendedProperties = {
      private: {
        chroniconTags: JSON.stringify(tags)
      }
    };
  }

  if (colorId) {
    eventObject.colorId = colorId;
  }

  if (id) {
    eventObject.id = id;
  }

  return eventObject;
};

export const normalizeEventName = (value) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || i18n.t("untitledEvent");
};

export const normalizeEventType = (value) => (
  value === EVENT_TYPES.ONE_TIME ? EVENT_TYPES.ONE_TIME : EVENT_TYPES.SERIES
);

export const normalizeReminderTime = (value) => (
  /^\d{2}:\d{2}$/.test(value || "") ? value : DEFAULT_REMINDER_TIME
);

export const createReminderRuleRecord = ({
  id,
  enabled = true,
  kind = REMINDER_KINDS.INTERVAL,
  anchor = REMINDER_ANCHORS.LAST,
  unit = REMINDER_UNITS.DAYS,
  value = 1,
  timeOfDay = DEFAULT_REMINDER_TIME,
  at = null,
}) => ({
  id: id || crypto.randomUUID(),
  enabled: enabled !== false,
  kind: Object.values(REMINDER_KINDS).includes(kind) ? kind : REMINDER_KINDS.INTERVAL,
  anchor: Object.values(REMINDER_ANCHORS).includes(anchor) ? anchor : REMINDER_ANCHORS.LAST,
  unit: Object.values(REMINDER_UNITS).includes(unit) ? unit : REMINDER_UNITS.DAYS,
  value: Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 1,
  timeOfDay: normalizeReminderTime(timeOfDay),
  at: at ? new Date(at).toISOString() : null,
});

export const parseReminderRuleRecord = (record) => {
  if (!record) return null;

  const normalized = createReminderRuleRecord(record);
  if (normalized.kind === REMINDER_KINDS.ONE_TIME && normalized.at) {
    const atDate = new Date(normalized.at);
    if (Number.isNaN(atDate.getTime())) {
      return null;
    }
  }

  return normalized;
};

export const hasEnabledReminders = (reminders = []) => reminders.some((rule) => rule?.enabled);

export const createEventSeriesRecord = ({
  id,
  name,
  description = "",
  colorId = null,
  tags = [],
  eventType = EVENT_TYPES.SERIES,
  reminders = [],
  pinnedAt = null,
  createdAt = new Date(),
  updatedAt = new Date(),
}) => ({
  id: id || crypto.randomUUID(),
  name: normalizeEventName(name),
  description,
  colorId,
  tags,
  eventType: normalizeEventType(eventType),
  reminders: reminders.map(createReminderRuleRecord),
  pinnedAt: pinnedAt ? new Date(pinnedAt).toISOString() : null,
  createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
  updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : new Date(updatedAt).toISOString(),
});

export const parseEventSeriesRecord = (record) => {
  if (!record) return null;

  return {
    id: record.id || crypto.randomUUID(),
    name: normalizeEventName(record.name),
    description: record.description || "",
    colorId: record.colorId || null,
    tags: Array.isArray(record.tags) ? record.tags : [],
    eventType: normalizeEventType(record.eventType),
    reminders: Array.isArray(record.reminders) ? record.reminders.map(parseReminderRuleRecord).filter(Boolean) : [],
    pinnedAt: record.pinnedAt ? new Date(record.pinnedAt) : null,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
  };
};

export const createOccurrenceRecord = ({
  id,
  eventSeriesId,
  occurrenceDate,
  createdAt = new Date(),
}) => {
  const date = occurrenceDate instanceof Date ? occurrenceDate : new Date(occurrenceDate || Date.now());
  const endDate = new Date(date.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);

  return {
    id: id || crypto.randomUUID(),
    eventSeriesId,
    occurrenceDate: date.toISOString(),
    endDate: endDate.toISOString(),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
  };
};

export const parseOccurrenceRecord = (record) => {
  if (!record) return null;

  const occurrenceDate = record.occurrenceDate instanceof Date ? record.occurrenceDate : new Date(record.occurrenceDate);
  const endDate = record.endDate instanceof Date ? record.endDate : new Date(record.endDate || record.occurrenceDate);

  if (Number.isNaN(occurrenceDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    id: record.id || crypto.randomUUID(),
    eventSeriesId: record.eventSeriesId,
    occurrenceDate,
    endDate,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
  };
};

export const getOccurrenceDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return startOfDay(date).getTime();
};

export const getUniqueOccurrencesByDay = (occurrences = []) => {
  const sorted = [...occurrences].sort((a, b) => a.startDate - b.startDate);
  const seenDays = new Set();

  return sorted.filter((occurrence) => {
    const dayKey = getOccurrenceDayKey(occurrence.startDate);
    if (dayKey === null || seenDays.has(dayKey)) {
      return false;
    }

    seenDays.add(dayKey);
    return true;
  });
};

export const hasOccurrenceOnSameDay = (occurrences = [], candidateDate, excludedOccurrenceId = null) => {
  const candidateDayKey = getOccurrenceDayKey(candidateDate);
  if (candidateDayKey === null) {
    return false;
  }

  return occurrences.some((occurrence) => (
    occurrence.id !== excludedOccurrenceId && getOccurrenceDayKey(occurrence.startDate || occurrence.occurrenceDate) === candidateDayKey
  ));
};

export const createDuplicateOccurrenceDayError = () => {
  const error = new Error(i18n.t("duplicateOccurrenceSameDay"));
  error.code = DUPLICATE_OCCURRENCE_DAY_ERROR;
  return error;
};

export const createStoredEventRecord = ({
  id,
  name,
  startDate,
  endDate,
  description = "",
  colorId = null,
  tags = [],
  recurringEventId = null,
  recurrence = null,
  eventType = EVENT_TYPES.ONE_TIME,
  reminders = [],
  pinnedAt = null,
}) => ({
  id: id || crypto.randomUUID(),
  name: normalizeEventName(name),
  startDate: startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString(),
  endDate: endDate instanceof Date
    ? endDate.toISOString()
    : new Date(endDate || startDate || Date.now()).toISOString(),
  description,
  colorId,
  tags,
  recurringEventId,
  recurrence,
  eventType: normalizeEventType(eventType),
  reminders: reminders.map(createReminderRuleRecord),
  pinnedAt: pinnedAt ? new Date(pinnedAt).toISOString() : null,
});

export const parseStoredEvent = (event) => {
  if (!event) return null;

  const startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
  const endDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate || event.startDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    id: event.id || crypto.randomUUID(),
    name: normalizeEventName(event.name),
    startDate,
    endDate,
    description: event.description || "",
    colorId: event.colorId || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    recurringEventId: event.recurringEventId || null,
    recurrence: event.recurrence || null,
    eventType: normalizeEventType(event.eventType || EVENT_TYPES.ONE_TIME),
    reminders: Array.isArray(event.reminders) ? event.reminders.map(parseReminderRuleRecord).filter(Boolean) : [],
    pinnedAt: event.pinnedAt ? new Date(event.pinnedAt) : null,
  };
};

export const buildOccurrenceEvents = (eventSeriesRecords, occurrenceRecords) => {
  const seriesById = new Map(eventSeriesRecords.map((series) => [series.id, series]));

  return occurrenceRecords
    .map((occurrence) => {
      const series = seriesById.get(occurrence.eventSeriesId);
      if (!series) return null;

      return {
        id: occurrence.id,
        eventSeriesId: series.id,
        name: series.name,
        startDate: occurrence.occurrenceDate,
        endDate: occurrence.endDate,
        description: series.description || "",
        colorId: series.colorId || null,
        tags: series.tags || [],
        eventType: normalizeEventType(series.eventType),
        reminders: series.reminders || [],
        pinnedAt: series.pinnedAt || null,
        recurringEventId: series.id,
        recurrence: null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startDate - b.startDate);
};

export const convertLegacyEventsToSeriesModel = (legacyEvents) => {
  const grouped = {};

  legacyEvents.forEach((event) => {
    const parsed = parseStoredEvent(event);
    if (!parsed) return;
    const key = parsed.recurringEventId || getImportEventGroupKey(parsed);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(parsed);
  });

  const eventSeries = [];
  const occurrences = [];

  Object.entries(grouped).forEach(([, groupedEvents]) => {
    groupedEvents.sort((a, b) => a.startDate - b.startDate);
    const first = groupedEvents[0];
    const series = createEventSeriesRecord({
      id: first.recurringEventId || undefined,
      name: first.name,
      description: first.description || "",
      colorId: first.colorId || null,
      tags: first.tags || [],
      eventType:
        first.eventType === EVENT_TYPES.SERIES || groupedEvents.length > 1
          ? EVENT_TYPES.SERIES
          : EVENT_TYPES.ONE_TIME,
      reminders: first.reminders || [],
      pinnedAt: first.pinnedAt || null,
    });

    eventSeries.push(series);
    groupedEvents.forEach((event) => {
      occurrences.push(
        createOccurrenceRecord({
          id: event.id,
          eventSeriesId: series.id,
          occurrenceDate: event.startDate,
        })
      );
    });
  });

  return { eventSeries, occurrences };
};

export const convertOccurrenceEventsToSeriesModel = (occurrenceEvents) => {
  return convertLegacyEventsToSeriesModel(occurrenceEvents);
};

export const getSeriesIdentity = (event) => (
  event?.eventSeriesId || event?.recurringEventId || event?.id || null
);

export const getImportEventGroupKey = (event) => {
  const normalizedName = normalizeEventName(event?.name);
  const description = (event?.description || "").trim().toLowerCase();
  const colorId = event?.colorId || "";
  const tags = Array.isArray(event?.tags) ? [...event.tags].map((tag) => String(tag).trim().toLowerCase()).sort().join("|") : "";

  return `${normalizedName}__${description}__${colorId}__${tags}`;
};

export const buildImportDedupKey = (event) => {
  const normalizedName = normalizeEventName(event?.name).toLowerCase();
  const startDate = event?.startDate instanceof Date ? event.startDate : new Date(event?.startDate);
  const startKey = Number.isNaN(startDate.getTime()) ? "invalid-date" : startDate.toISOString();
  const description = (event?.description || "").trim().toLowerCase();
  const colorId = event?.colorId || "";
  const tags = Array.isArray(event?.tags) ? [...event.tags].map((tag) => String(tag).trim().toLowerCase()).sort().join("|") : "";

  return `${normalizedName}__${startKey}__${description}__${colorId}__${tags}`;
};

export const groupEventsByName = (events) => {
  if (!events || !Array.isArray(events)) return {};

  const eventsByName = events.reduce((acc, event) => {
    const key = getImportEventGroupKey(event);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  Object.keys(eventsByName).forEach((key) => {
    eventsByName[key].sort((a, b) => a.startDate - b.startDate);
  });

  return eventsByName;
};

export const groupOccurrenceEventsBySeries = (events = []) => {
  const groups = new Map();

  events.forEach((event) => {
    const key = getSeriesIdentity(event) || normalizeEventName(event?.name);
    const current = groups.get(key) || [];
    current.push(event);
    groups.set(key, current);
  });

  return [...groups.entries()].map(([seriesId, seriesEvents]) => ({
    seriesId,
    occurrences: [...seriesEvents].sort((a, b) => a.startDate - b.startDate),
  }));
};

export const normalizeSearchQuery = (value) => (
  typeof value === "string" ? value.trim().toLowerCase() : ""
);

export const matchesEventQuery = (event, query) => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return true;
  }

  const searchableParts = [
    event?.name,
    event?.description,
    ...(Array.isArray(event?.tags) ? event.tags : []),
  ];

  return searchableParts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
};

export const calculateEventStats = (event, allEvents) => {
  if (!event || !allEvents || !Array.isArray(allEvents)) {
    return null;
  }

  const occurrences = getUniqueOccurrencesByDay(allEvents
    .filter(e => (event.eventSeriesId ? e.eventSeriesId === event.eventSeriesId : e.name === event.name))
  );

  if (!occurrences.length) return null;

  const firstOccurrence = occurrences[0];
  const lastOccurrence = occurrences[occurrences.length - 1];
  const today = new Date();
  const occurrenceIndex = occurrences.findIndex(e => e.id === event.id);

  const stats = {
    isFirstOccurrence: occurrenceIndex === 0,
    occurrenceNumber: occurrenceIndex + 1,
    totalOccurrences: occurrences.length,
    daysSinceFirst: differenceInDays(today, firstOccurrence.startDate),
    monthsSinceFirst: differenceInMonths(today, firstOccurrence.startDate),
    yearsSinceFirst: differenceInYears(today, firstOccurrence.startDate),
    daysSinceLast: differenceInDays(today, lastOccurrence.startDate),
  };

  if (occurrences.length > 1) {
    let totalGapDays = 0;
    for (let i = 1; i < occurrences.length; i++) {
      totalGapDays += differenceInDays(
        occurrences[i].startDate,
        occurrences[i - 1].startDate
      );
    };
    stats.averageGapDays = Math.round(totalGapDays / (occurrences.length - 1));

    if (occurrenceIndex > 0) {
      const previousOccurrence = occurrences[occurrenceIndex - 1];
      stats.daysSincePrevious = differenceInDays(
        event.startDate,
        previousOccurrence.startDate
      );
    }

    if (occurrenceIndex < occurrences.length - 1) {
      const nextOccurrence = occurrences[occurrenceIndex + 1];
      stats.daysUntilNext = differenceInDays(
        nextOccurrence.startDate,
        event.startDate
      );
    }
  }

  return stats;
};
